# 实名认证技术方案

## 1. 设计原则

- **多态认证主体**：认证记录通过 `verifiable_type` + `verifiable_id` 多态关联，当前接入 `User`，未来可扩展至其他主体（如商户、合作伙伴），认证记录层无需改动。
- **状态同步到主体主表**：用户表 (`users`) 直接存储 `identity_type` 和 `identity_status` 两个字段，查询认证状态零 Join；认证记录表 (`identity_verifications`) 仅保留完整审核轨迹。
- **个人与企业双类型**：支持 `personal`（个人）和 `enterprise`（企业）两种认证类型，共用同一张记录表，通过 `type` 字段区分必填字段。
- **驳回原因字典化**：驳回原因通过 `identity_reject_reason` 字典管理，管理员从预设原因中选择，支持灵活扩展。
- **事件驱动通知**：审核通过/驳回分别派发 `IdentityVerified` / `IdentityRejected` 事件，支持实时广播（Private Channel）和异步队列处理。
- **认证有效期**：审核通过时自动设置 3 年有效期（`expires_at`），到期后需重新认证。

## 2. 代码结构

```
app/
├── Enums/
│   ├── IdentityStatus.php                        # 实名认证状态枚举（unsubmitted/pending/approved/rejected）
│   ├── IdentityType.php                          # 认证类型枚举（personal/enterprise）
│   └── ReviewStatus.php                          # 通用审核状态枚举（含 review，评论模块使用）
├── Models/User/
│   └── IdentityVerification.php                  # 认证记录模型（多态 verifiable + BelongsTo admin）
├── Services/
│   └── IdentityVerificationService.php           # 认证服务（提交/通过/驳回编排）
├── Events/User/
│   ├── IdentityVerified.php                      # 认证通过事件（ShouldBroadcast + ShouldQueue）
│   └── IdentityRejected.php                      # 认证驳回事件（ShouldBroadcast + ShouldQueue）
├── Http/Controllers/
│   ├── Api/V1/User/
│   │   └── IdentityController.php                 # 用户端认证接口（show/status/submit）
│   └── Admin/
│       └── IdentityVerificationController.php     # 管理端认证审核接口（index/stats/show/approve/reject）
├── Http/Requests/
│   ├── Api/V1/User/Identity/
│   │   └── SubmitIdentityRequest.php              # 用户提交认证请求校验
│   └── Admin/Identity/
│       ├── IdentityIndexRequest.php               # 管理端列表筛选请求
│       └── RejectIdentityRequest.php              # 管理端驳回请求校验
├── Http/Resources/
│   ├── Api/V1/
│   │   └── IdentityVerificationResource.php      # 用户端认证资源（脱敏展示）
│   └── Admin/
│       ├── IdentityVerificationResource.php       # 管理端认证资源（含完整信息 + 驳回原因标签）
│       └── IdentityVerificationStatResource.php   # 管理端认证统计资源
└── Policies/
    └── IdentityVerificationPolicy.php             # 认证记录策略
```

## 3. 数据模型

### 3.1 users 表（主体表）

用户表直接存储认证状态热数据，查询零 Join：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| identity_type | VARCHAR(16) | 实名认证类型：`personal` / `enterprise`，null 表示未认证 |
| identity_status | VARCHAR(16) | 实名认证状态（枚举 `ReviewStatus`，默认 `unsubmitted`） |

### 3.2 identity_verifications 表（认证记录表）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键 |
| verifiable_type | VARCHAR(100) | 申请人类型（多态，如 `App\Models\User`） |
| verifiable_id | BIGINT | 申请人 ID |
| type | VARCHAR(16) | 认证类型（`personal` / `enterprise`） |
| status | VARCHAR(16) | 审核状态（`pending` / `approved` / `rejected`） |
| real_name | VARCHAR(64) | 真实姓名（个人认证） |
| id_card_no | VARCHAR(32) | 身份证号（密文存储，响应隐藏） |
| id_card_front | VARCHAR | 身份证人像面图片路径 |
| id_card_back | VARCHAR | 身份证国徽面图片路径 |
| handheld | VARCHAR | 手持身份证图片路径 |
| company_name | VARCHAR(128) | 企业名称（企业认证） |
| credit_code | VARCHAR(32) | 统一社会信用代码（18 位） |
| legal_person_name | VARCHAR(64) | 法人姓名（企业认证） |
| legal_person_id_card_no | VARCHAR(32) | 法人身份证号（密文存储，响应隐藏） |
| business_license | VARCHAR | 营业执照图片路径 |
| opening_permit | VARCHAR | 开户许可证图片路径 |
| bank_account | VARCHAR(64) | 对公账户（响应隐藏） |
| bank_name | VARCHAR(64) | 开户行 |
| admin_id | BIGINT | 审核管理员 ID |
| reject_reason | VARCHAR(32) | 驳回原因（字典 `identity_reject_reason` 的 value） |
| reject_remark | TEXT | 驳回备注 |
| submitted_at | TIMESTAMP | 提交时间 |
| reviewed_at | TIMESTAMP | 审核时间 |
| expires_at | TIMESTAMP | 认证有效期（通过后自动设置 +3 年） |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**索引**：`(verifiable_type, verifiable_id)` 复合索引、`type` 索引、`status` 索引、`admin_id` 索引。

> 敏感字段（`id_card_no`、`legal_person_id_card_no`、`bank_account`）通过模型 `#[Hidden]` 属性在所有响应中自动隐藏。

### 3.3 相关枚举

**IdentityType（认证类型）**：

| 值 | 说明 |
|----|------|
| personal | 个人认证 |
| enterprise | 企业认证 |

**IdentityStatus（实名认证状态）**：

> 实名认证模块使用独立的 `IdentityStatus` 枚举，不复用 `ReviewStatus`（后者包含 `review` 状态，供评论模块使用）。

| 值 | 说明 | 标签样式 |
|----|------|----------|
| unsubmitted | 未提交 | info |
| pending | 待审核 | warning |
| approved | 已通过 | success |
| rejected | 已驳回 | danger |

### 3.4 驳回原因字典（identity_reject_reason）

迁移文件预置以下字典项，管理员也可通过后台字典管理动态扩展：

| 值 | 标签 | 标签样式 |
|----|------|----------|
| id_blurry | 证件模糊不清 | warning |
| mismatch | 证件信息不符 | danger |
| expired | 证件已过期 | info |
| invalid | 证件无效 | danger |
| incomplete | 证件资料不完整 | warning |
| other | 其他原因 | info |

## 4. 业务流程

### 4.1 用户提交认证

1. 用户通过 `POST /api/v1/user/identity` 提交认证信息，`type` 指定个人或企业。
2. 服务层在事务内加行锁检查：同一用户同时仅允许一条 `pending` 记录，否则返回 422。
3. 创建认证记录（状态 `pending`），同步用户表 `identity_status` 为 `pending`。
4. 返回认证记录资源。

**个人认证必填字段**：`real_name`、`id_card_no`、`id_card_front`
**企业认证必填字段**：`company_name`、`credit_code`、`legal_person_name`、`legal_person_id_card_no`、`business_license`

> 身份证号通过 `IdCardRule` 校验合法性；统一社会信用代码通过正则校验 18 位格式。

### 4.2 管理员审核通过

1. 管理员通过 `POST /admin/identity-verifications/{verification}/approve` 审核通过。
2. 服务层在事务内：
   - 更新记录状态为 `approved`，记录 `admin_id`、`reviewed_at`、`expires_at`（+3 年），清空驳回字段。
   - 同步用户表 `identity_type` 和 `identity_status` 为 `approved`。
   - 派发 `IdentityVerified` 事件。
3. 前置校验：已通过或已驳回的记录不可重复审核，返回 422。

### 4.3 管理员审核驳回

1. 管理员通过 `POST /admin/identity-verifications/{verification}/reject` 审核驳回。
2. 请求参数：`reason`（必填，须为字典 `identity_reject_reason` 中已启用的 value）、`remark`（可选，最多 500 字）。
3. 服务层在事务内：
   - 更新记录状态为 `rejected`，记录 `admin_id`、`reviewed_at`、`reject_reason`、`reject_remark`。
   - 同步用户表 `identity_status` 为 `rejected`。
   - 派发 `IdentityRejected` 事件。
4. 用户可在驳回后重新提交认证。

### 4.4 状态流转图

```
              提交认证
                 │
                 ▼
            ┌─────────┐
            │ pending  │
            └────┬────┘
                 │
          管理员审核
        ├──────────────┐
        ▼              ▼
  ┌──────────┐   ┌──────────┐
  │ approved │   │ rejected │（可重新提交）
  └──────────┘   └──────────┘
     （终态，设置有效期）
```

## 5. 事件与广播

### 5.1 IdentityVerified（认证通过）

- 实现：`ShouldBroadcast` + `ShouldQueue` + `ShouldHandleEventsAfterCommit`
- 广播频道：`PrivateChannel("User.{id}")`
- 用途：触发站内信通知、推送等异步处理

### 5.2 IdentityRejected（认证驳回）

- 实现：`ShouldBroadcast` + `ShouldQueue` + `ShouldHandleEventsAfterCommit`
- 广播频道：`PrivateChannel("User.{id}")`
- 携带数据：`reason`（驳回原因）、`remark`（驳回备注）
- 用途：触发站内信通知用户驳回原因

> 两个事件均在数据库事务提交后派发，确保数据一致性。广播频道通过 `routes/channels.php` 中的 `Broadcast::channel('User.{id}', ...)` 授权。

## 6. API 接口

### 6.1 用户端接口（/api/v1/user/identity）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/v1/user/identity` | 当前用户最新一条认证记录 | Sanctum |
| GET | `/api/v1/user/identity/status` | 简要认证状态 | Sanctum |
| POST | `/api/v1/user/identity` | 提交/重新提交实名认证 | Sanctum |

**GET `/api/v1/user/identity/status` 响应**：

```json
{
  "is_verified": false,
  "identity_type": null,
  "identity_type_label": null,
  "latest_status": "rejected",
  "latest_status_label": "已驳回",
  "latest_reject_reason": "id_blurry",
  "latest_reject_remark": "身份证人像面照片模糊，请重新拍摄上传"
}
```

**POST `/api/v1/user/identity` 请求参数**：

| 字段 | 类型 | 必填条件 | 说明 |
|------|------|----------|------|
| type | string | 必填 | 认证类型：`personal` / `enterprise` |
| real_name | string | type=personal | 真实姓名（最长 64 字） |
| id_card_no | string | type=personal | 身份证号（校验合法性） |
| id_card_front | string | type=personal | 身份证人像面图片路径 |
| id_card_back | string | 可选 | 身份证国徽面图片路径 |
| handheld | string | 可选 | 手持身份证图片路径 |
| company_name | string | type=enterprise | 企业名称（最长 128 字） |
| credit_code | string | type=enterprise | 统一社会信用代码（18 位） |
| legal_person_name | string | type=enterprise | 法人姓名 |
| legal_person_id_card_no | string | type=enterprise | 法人身份证号 |
| business_license | string | type=enterprise | 营业执照图片路径 |
| opening_permit | string | 可选 | 开户许可证图片路径 |
| bank_account | string | 可选 | 对公账户 |
| bank_name | string | 可选 | 开户行 |

> 用户端响应通过 `IdentityVerificationResource` 返回，个人认证不返回企业字段，企业认证不返回个人字段，敏感字段（身份证号、对公账户）始终隐藏。

### 6.2 管理端接口（/admin/identity-verifications）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/admin/identity-verifications` | 认证记录列表（分页） | identity-verifications.index |
| GET | `/admin/identity-verifications/stats` | 认证统计 | identity-verifications.index |
| GET | `/admin/identity-verifications/{verification}` | 认证记录详情 | identity-verifications.index |
| POST | `/admin/identity-verifications/{verification}/approve` | 审核通过 | identity-verifications.edit |
| POST | `/admin/identity-verifications/{verification}/reject` | 审核驳回 | identity-verifications.edit |

**列表筛选参数**：

| 参数 | 说明 |
|------|------|
| verifiable_id | 申请人 ID |
| keyword | 关键词（匹配真实姓名/企业名称/信用代码/法人姓名/用户名/手机号） |
| type | 认证类型 |
| status | 审核状态 |
| start_date | 提交起始日期 |
| end_date | 提交截止日期 |

**统计接口响应**：

```json
{
  "total": 1280,
  "pending": 15,
  "today": 8,
  "approved": 1200,
  "rejected": 65
}
```

> 管理端响应通过 `Admin\IdentityVerificationResource` 返回，包含完整认证信息、审核管理员名称、驳回原因标签（从字典缓存读取，TTL 2 小时）。驳回原因标签映射通过 `getRejectReasonMap()` 方法带缓存读取，字典变更后可通过 `flushRejectReasonMapCache()` 清除缓存。

## 7. 安全与隐私

- **敏感字段隐藏**：`id_card_no`、`legal_person_id_card_no`、`bank_account` 通过模型 `#[Hidden]` 在所有响应中自动隐藏。
- **并发控制**：用户提交认证时使用 `lockForUpdate()` 防止并发提交多条待审记录。
- **事务一致性**：提交、通过、驳回三个操作均在 `DB::transaction` 内执行，确保认证记录与用户表状态同步。
- **权限控制**：管理端审核接口通过 `permission` 中间件控制（`identity-verifications.index` / `identity-verifications.edit`）。
- **驳回原因校验**：驳回请求的 `reason` 字段在运行时从字典表动态读取可用值，字典禁用后旧值不可再选。
- **认证有效期**：审核通过时自动设置 `expires_at`（+3 年），到期后可通过定时任务或业务逻辑引导用户重新认证。

---

> 文档来源：PRD 实名认证模块
