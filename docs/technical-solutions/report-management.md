# 举报管理技术方案

## 1. 设计原则

- **多态被举报对象**：举报记录通过 `reportable_type` + `reportable_id` 多态关联被举报对象，当前接入 `Comment` 与 `User`，未来可扩展任意业务实体（动态、作品等），举报记录层无需改动。
- **可被举报对象 trait 化**：`App\Models\Traits\HasReportable` 提供 `reports()` 反向关联 + `pendingReportsCount()` 辅助方法。需要被举报的模型仅需 `use HasReportable`。
- **字典化管理举报分类**：通过 `report_category` 字典统一管理 9 项分类，可由运营在后台字典管理界面动态调整而无需发版。
- **手动联动处置**：管理员处理举报时手动勾选要下发的动作（`hide_comment` / `delete_comment` / `freeze_user`），由 `ReportService::process()` 在同一事务中执行；失败回滚保证一致性。
- **冻结为永久冻结**：仅设置 `UserStatus::FROZEN`，管理员通过「用户管理 → 状态切换」人工解冻；动作协议不含时长字段。
- **状态机防并发**：首次处理时由 `pending` 自动流转为 `processing`，避免多人重复操作；已结案（resolved/rejected）的举报不可再次处理。
- **防刷（业务层）**：同一 `(user_id, reportable_type, reportable_id)` 在 `pending`/`processing` 状态下不可重复提交，由 `ReportService::submit()` 校验。

## 2. 代码结构

```
app/
├── Enums/
│   └── ReportStatus.php                           # 举报处理状态枚举（pending/processing/resolved/rejected）
├── Models/Content/
│   └── Report.php                                  # 举报模型（多态 MorphTo + belongsTo User/Admin）
├── Models/Traits/
│   └── HasReportable.php                           # 可被举报对象 trait（morphMany + pendingReportsCount）
├── Models/User.php                                 # 引入 HasReportable（reports() morphMany = 该用户被举报的记录；submit() 手动 new Report 不依赖关系）
├── Services/
│   └── ReportService.php                           # 举报业务服务（submit/process/listQuery/stats）
├── Http/Controllers/
│   ├── Api/V1/
│   │   └── ReportController.php                    # 用户端举报接口（store/index）
│   └── Admin/
│       └── ReportController.php                    # 管理端举报接口（index/show/update/stats/export）
├── Http/Requests/
│   ├── Api/V1/Report/
│   │   └── StoreReportRequest.php                  # 用户端提交举报请求校验（含 morph alias + exists 校验）
│   └── Admin/Report/
│       └── ReportProcessRequest.php                # 管理端处理举报请求校验（含 actions 内联 JSON Schema）
├── Http/Resources/
│   ├── Api/V1/
│   │   └── ReportResource.php                      # 用户端举报资源（自动 morph alias 反查）
│   └── Admin/
│       ├── ReportResource.php                      # 管理端举报资源（含 reportable_snapshot 多态快照）
│       └── ReportStatResource.php                  # 管理端举报统计资源
├── Exports/Admin/
│   └── ReportListExport.php                        # 列表导出实现（AbstractExport，同步/异步双通道）
├── Policies/
│   └── ReportPolicy.php                            # 举报策略
└── database/migrations/
    └── 2026_09_30_000002_create_reports_table.php   # 主表迁移（同时注入举报分类字典）
```

## 3. 数据模型

### 3.1 reports 主表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键 |
| user_id | BIGINT | 举报人用户 ID |
| reportable_id | BIGINT | 被举报对象 ID |
| reportable_type | VARCHAR(255) | 被举报对象多态类型（morph alias：`comment` / `user`，由 `Relation::enforceMorphMap()` 全局别名统一管理，不存储全限定类名） |
| category | VARCHAR(32) | 举报分类（取自字典 `report_category`） |
| reason | VARCHAR(500) | 举报描述（可空） |
| evidence | JSON | 证据图片 URL 数组（可空，最多 9 张） |
| status | VARCHAR(16) | 处理状态（pending/processing/resolved/rejected） |
| handler_id | BIGINT | 处理人管理员 ID（可空） |
| process_remark | VARCHAR(500) | 处理备注（可空） |
| process_actions | JSON | 处置动作记录（可空，格式见下） |
| processed_at | TIMESTAMP | 处理时间（可空） |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间（列存在，但模型声明 `UPDATED_AT = null` 不自动维护，值恒为 NULL） |

索引：
- `reportable_type + reportable_id` 复合索引（多态查询）
- `status + category + created_at` 复合索引（筛选）
- `handler_id + processed_at` 复合索引（按处理人查询）
- `user_id + status` 复合索引（用户自己的举报列表）

### 3.2 process_actions JSON 协议

```json
[
  { "type": "hide_comment", "reason": null },
  { "type": "freeze_user", "reason": null }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | 动作类型：`hide_comment` / `delete_comment` / `freeze_user` |
| reason | string \| null | 动作说明（可空） |

### 3.3 字典 report_category

固定 9 项（迁移自动注入，可由后台字典管理界面调整）：

| value | label | label_type |
|-------|-------|------------|
| pornography | 色情低俗 | danger |
| violence | 暴力血腥 | warning |
| political | 政治敏感 | danger |
| ad | 广告营销 | info |
| insult | 辱骂人身攻击 | warning |
| fake | 虚假信息 | warning |
| infringement | 侵权抄袭 | info |
| illegal | 违法违规 | danger |
| other | 其他 | default |

## 4. 状态机

```
[新举报] → pending ──(管理员首次处理)──→ processing ──(status=resolved)──→ resolved
                                       │
                                       └────────(status=rejected)───────→ rejected
```

- `pending → processing` 在 `ReportController::update()` 入口自动推进（避免多人重复操作）
- `status` 仅允许写入 `resolved` / `rejected`（controller 白名单 + `ReportStatus::tryFrom` 双重校验）
- 状态机在 `ReportStatus` 枚举上提供 `isClosed()` / `isResolved()` / `isRejected()` 辅助判断
- 已结案（resolved / rejected）的举报再次处理返回 422

## 5. 联动处置动作

### 5.1 hide_comment

将被举报评论的 `status` 改为 `ReviewStatus::REJECTED`，触发「评论模块」的「已驳回」展示逻辑。

### 5.2 delete_comment

删除被举报评论，`CommentObserver::deleted` 事件递归删除该评论的所有回复。

### 5.3 freeze_user

将被举报对象的作者（被举报用户 / 被举报评论的作者）`status` 改为 `UserStatus::FROZEN`（永久冻结）。

- 不设置 `frozen_until`（用户表未存储冻结截止时间）
- 解冻路径：`PUT /admin/users/{user}/toggle-status`（管理员人工切换）

## 6. 接口约定

### 6.1 用户端 (`/api/v1/user/reports`)

- `POST /reports`：提交举报（`target_type` ∈ `comment`/`user`，`category` 字典项，`reason` ≤500 字，`evidence` ≤9 个 URL），需 Sanctum 登录；返回 201 + 完整 ReportResource（`target_type` 回显 morph alias、`target_id` 回显对象 ID）
- `GET /reports/my`：当前登录用户的举报列表（按提交时间倒序），分页

提交时 `target_type` 仅接受 morph alias（`comment` / `user`），避免暴露内部类名。`StoreReportRequest` 在 `prepareForValidation()` 阶段通过 `Relation::getMorphedModel()` 解析 alias → 全限定类名，并在 `rules()` 中追加 `exists:<table>,id` 校验目标存在。

### 6.2 管理端 (`/admin/reports`)

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/admin/reports` | reports.index | 列表（分页，支持 7 维度筛选） |
| GET | `/admin/reports/stats` | reports.index | 统计（total/pending/today/closed） |
| GET | `/admin/reports/{report}` | reports.index | 详情（含 reportable_snapshot 多态快照） |
| PUT | `/admin/reports/{report}` | reports.edit | 处理（status=resolved/rejected + 联动处置 actions） |
| GET | `/admin/reports/export` | reports.export | 导出（同步/异步双通道，阈值 1000 行） |

详情接口的 `reportable_snapshot` 字段按对象类型返回不同结构：

```json
// comment 快照
{
  "type": "comment",
  "id": 100,
  "user_id": 200,
  "username": "违规作者",
  "content": "违规内容...",
  "status": "rejected",
  "status_label": "已驳回",
  "created_at": "2026-09-30 14:00:00"
}
// user 快照
{
  "type": "user",
  "id": 200,
  "username": "spammer",
  "name": "违规作者",
  "avatar": "https://...",
  "status": 0,
  "status_label": "已冻结",
  "registered_at": "2026-01-01 00:00:00"
}
```

当被举报对象已被删除时，`reportable_snapshot` 返回 `null`，详情接口其余字段仍正常返回。

## 7. 防并发与幂等

- **同人多态目标去重**：`ReportService::submit()` 在事务前查询同 `(user_id, reportable_type, reportable_id)` 是否存在 `pending`/`processing` 记录，存在则 abort(422)
- **管理员并发处理**：`pending → processing` 在处理入口自动推进（见 §4），标记"处理中"减少重复介入；`processing` 状态仍允许其他管理员提交最终结论，处置动作仅在 `status=resolved` 时执行（`rejected` 不下发动作）；已结案（resolved/rejected）记录在入口即被 `isClosed()` 拦截返回 422
- **状态机白名单**：controller 拒绝任何非 `resolved`/`rejected` 的状态写入
- **联动处置事务包裹**：`ReportService::process()` 在 `DB::transaction()` 中执行，写入与处置动作同进退

## 8. 测试覆盖

| 测试文件 | 覆盖场景 |
|---------|---------|
| `tests/Feature/Api/V1/ReportControllerTest.php` | 用户端：游客 401、登录提交成功、举报评论/用户、目标不存在 422、非法 target_type/category 422、重复举报 422、已驳回可重新举报、我的列表隔离、evidence 边界 |
| `tests/Feature/Admin/ReportControllerIndexTest.php` | 管理端：列表分页与字段、详情快照（comment/user/已删除）、按 status/category/reportable_type/keyword/日期 筛选、统计四字段 |
| `tests/Feature/Admin/ReportControllerProcessTest.php` | 管理端：状态流转、handler_id/时间记录、已结案 422、联动处置 hide/delete/freeze、rejected 不执行动作、多动作并发、非法 action/status 422、process_actions 持久化 |