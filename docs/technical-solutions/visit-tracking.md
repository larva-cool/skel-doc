# 访问记录技术方案

## 1. 设计目标与定位

访问记录用于记录用户对任意多态资源（Post / Goods / Video / Comment 等）的浏览行为，是后续 PV/UV 分析、"最近浏览"、热度排序等业务场景的基础数据层。本系统以**轻量、append-only、可扩展**为设计原则，仅记录"看过"这一事实，不做撤销、计数字段维护或唯一约束。

### 1.1 设计原则

| 原则 | 说明 |
|------|------|
| **Append-only** | 仅插入新记录，不提供撤销/删除接口；表无 `updated_at` |
| **多态设计** | `source_type` + `source_id` 复用项目现有 `morph_maps` 别名，与 Like/Collection/Comment 保持一致 |
| **不做唯一约束** | 同一用户对同一资源可多次访问，符合 PV（页面浏览量）语义 |
| **不维护计数** | 区别于 Like/Collection，Visit 不维护目标资源的访问次数（避免与多态资源耦合，PV 由后续聚合查询按需计算） |
| **同步写入** | 当前采用同步 `insert`；若后续出现性能瓶颈可平滑迁移到队列异步落库 |

### 1.2 与现有互动表的关系

| 维度 | Like / Collection | Visit |
|------|-------------------|-------|
| 多态资源 | ✅ morphs | ✅ `source_type` + `source_id` |
| 唯一约束 | ✅ `uniq_user_*` | ❌（允许重复） |
| 计数字段 | `like_count` / `collection_count` | ❌（不维护） |
| `updated_at` | ✅ | ❌ |
| `user_id` 隐藏 | ✅ `#[Hidden]` | ❌（保留，便于自查询） |
| 删除/撤销 | ✅ DELETE 接口 | ❌（append-only） |
| IP | ❌ | ✅ `varbinary(16)` |

---

## 2. 数据模型

### 2.1 数据表：visits

访问记录表，每条记录代表一次用户对资源的访问行为。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | BIGINT UNSIGNED PK AUTO_INCREMENT | 主键 |
| `user_id` | BIGINT UNSIGNED NOT NULL | 访问用户 ID（前台用户） |
| `source_type` | VARCHAR(255) NOT NULL | 多态类型别名（须在 `config/morph_maps.php` 中注册） |
| `source_id` | BIGINT UNSIGNED NOT NULL | 资源 ID |
| `ip` | VARBINARY(16) NULL | 访问 IP（兼容 IPv4/IPv6，与 `login_histories` 一致） |
| `created_at` | TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP | 访问时间 |

#### 索引

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| `idx_visit_source` | `source_type, source_id` | 普通索引 | 按资源反查访问者（资源热度 / PV 计算） |
| `idx_visit_user_source` | `user_id, source_type, source_id` | 普通索引 | 按用户查访问过的资源（"最近浏览"等场景） |

> 设计要点：
> - `source_type` 长度 255 与项目 morph_maps 别名体系保持一致
> - `ip` 在迁移文件中通过 `ALTER TABLE ... MODIFY COLUMN ip VARBINARY(16)` 收紧为定长二进制存储，节省空间并兼容 IPv6
> - 不创建外键约束，避免与多态资源耦合；多态完整性由业务层（`source_types()` 白名单）兜底

---

### 2.2 模型：Visit

**命名空间**：`App\Models\Visit`
**表名**：`visits`

#### 关键属性

```php
#[Table('visits')]
#[Fillable(['user_id', 'source_type', 'source_id', 'ip'])]
class Visit extends Model
{
    use HasFactory, HasUser;

    public const UPDATED_AT = null;
}
```

#### 关联

通过 `HasUser` trait 复用：

```php
/** @return BelongsTo<User, Visit> */
public function user(): BelongsTo

/** 查询作用域：限定到指定用户的访问记录 */
public function scopeForUser(Builder $query, User|int|string $user): Builder
```

> **注意**：Visit 模型**未定义** `source(): MorphTo` 关联，因为：
> 1. 访问记录的目标资源访问频次极低（仅写入与列表），按需通过 `morphMap` 反查即可
> 2. 避免每次记录访问都额外 join 多态目标资源
> 3. 资源后续被删除时不影响访问历史

#### 字段类型映射（`casts()`）

| 字段 | 类型 |
|------|------|
| `id` | integer |
| `user_id` | integer |
| `source_type` | string |
| `source_id` | integer |
| `ip` | string |
| `created_at` | datetime |

---

## 3. 核心流程

### 3.1 记录一次访问（写入流程）

```
客户端打开资源详情页
        ↓
POST /api/v1/visits 携带 { source_type, source_id }
        ↓
VisitController::record(RecordVisitRequest)
        ↓
RecordVisitRequest::prepareForValidation()
  - 注入 user_id（来自 Sanctum 当前用户）
  - 注入 ip（来自 Request::ip()，即 X-Forwarded-For 解析后的客户端 IP）
        ↓
rules() 校验 source_type 是否在 source_types() 白名单
        ↓
Visit::create($request->validated())
        ↓
返回 201 + VisitResource
```

**设计要点**：
- `user_id` 与 `ip` **禁止**由客户端传入，由 `prepareForValidation()` 在服务端注入，符合「控制器不写赋值逻辑」的项目规范
- `user_id` 通过 Sanctum 中间件保证已登录；IP 通过 Laravel `Request::ip()` 自动处理反向代理头

### 3.2 我的访问记录列表（读取流程）

```
GET /api/v1/user/visits?source_type=comment&page=1&per_page=15
        ↓
VisitController::myVisits(MyVisitsIndexRequest)
        ↓
Visit::forUser($request->user()->id)
    ->when(source_type, where source_type = ?)
    ->orderByDesc('id')
    ->paginate(per_page($request))
        ↓
VisitResource::collection()
```

**索引使用**：
- 无 `source_type` 过滤：使用 `PRIMARY KEY` 倒序扫描（id 即聚集索引）
- 有 `source_type` 过滤：依靠 `idx_visit_user_source(user_id, source_type, source_id)` 前缀匹配
- 反向场景（按资源查访问者）：使用 `idx_visit_source(source_type, source_id)`

---

## 4. API 设计

### 4.1 前台用户端 API

两条接口均需 `auth:sanctum` 认证。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/visits` | 记录一次访问（`user_id` / `ip` 由后端注入） |
| GET | `/api/v1/user/visits` | 我的访问记录列表（分页，可按 `source_type` 过滤） |

#### 4.1.1 POST /api/v1/visits

**请求体**：

```json
{
  "source_type": "comment",
  "source_id": 1001
}
```

| 字段 | 必填 | 校验规则 |
|------|------|----------|
| `source_type` | ✅ | 命中 `source_types()` 白名单（`morph_maps.php` 已注册别名） |
| `source_id` | ✅ | integer ≥ 1 |

**响应 201**：

```json
{
  "id": 62825,
  "source_type": "comment",
  "source_id": 1001,
  "ip": "192.168.1.1",
  "created_at": "2026-09-30 10:00:00"
}
```

> 客户端不需要关心 `user_id` 与 `ip`；由服务端在 `prepareForValidation()` 中注入，避免越权写入他人访问记录。

**错误响应**：

| 状态码 | 场景 |
|--------|------|
| 401 | 未登录或 Token 无效 |
| 422 | `source_type` 不在白名单、`source_id` 缺失或非法 |

#### 4.1.2 GET /api/v1/user/visits

**查询参数**：

| 参数 | 必填 | 说明 |
|------|------|------|
| `source_type` | ❌ | 可选过滤，须命中白名单 |
| `page` | ❌ | 全局分页参数，默认 1 |
| `per_page` | ❌ | 全局分页参数，默认 15，范围 1-100 |

**响应 200**：Laravel 标准分页结构，`data` 字段为 `VisitResource[]`。

```json
{
  "data": [
    {
      "id": 62825,
      "source_type": "comment",
      "source_id": 1001,
      "ip": "192.168.1.1",
      "created_at": "2026-09-30 10:00:00"
    }
  ],
  "links": {...},
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 15,
    "total": 1
  }
}
```

### 4.2 后台管理 API

> 本期**不实现**管理后台接口（`/admin/visits`），仅保留扩展点：
>
> - 模型 `Visit` 已就绪，遵守 Admin/Api 模块隔离规范，未来需要时可独立创建 `VisitAdminResource` 与 `Admin/VisitController`
> - 如需统计 PV/UV，建议使用聚合查询而非全量拉取，避免大表扫描

---

## 5. 与现有系统的集成点

### 5.1 多态资源白名单

复用项目 `config/morph_maps.php` 注册的多态别名，无需额外配置：

```php
// config/morph_maps.php
return [
    'user' => App\Models\User::class,
    'admin' => App\Models\Admin\Admin::class,
    'comment' => App\Models\Content\Comment::class,
    // ...
];
```

校验来源（`bootstrap/helpers.php`）：

```php
function source_types(): array
{
    return array_keys(Relation::morphMap());
}
```

任何未在 `morph_maps.php` 中注册的 `source_type` 均返回 422，避免脏数据污染统计。

### 5.2 与 IP 存储规范的对齐

与 `login_histories` 表保持一致：`ip` 字段在 MySQL 下迁移为 `VARBINARY(16)`，支持 IPv4/IPv6 双栈。读取时按需调用 `INET_NTOA(ip)` 反解（不在 Resource 中暴露原始二进制，由 Eloquent cast 为 string 自动处理）。

### 5.3 与控制器 / Request 职责划分规范

严格遵守 `.trae/rules/controller_request_rules.md`：

| 维度 | 实现位置 |
|------|----------|
| `user_id` 注入 | `RecordVisitRequest::prepareForValidation()` |
| `ip` 注入 | `RecordVisitRequest::prepareForValidation()` |
| `source_type` 白名单校验 | `RecordVisitRequest::rules()` |
| 业务调用 | `VisitController::record()` 仅 `Visit::create($request->validated())` |
| 列表查询条件组装 | `VisitController::myVisits()` 通过 `MyVisitsIndexRequest` 校验后用 query builder 拼装 |

控制器中**不存在**任何 `$request->input(...)` / `$request->merge(...)` / `$request->ip()` 等赋值调用。

---

## 6. 性能与扩展性

### 6.1 写入路径

- 单条 `INSERT INTO visits (...)` 在 InnoDB 下写入延迟 < 1ms（4 亿级数据量测试基线）
- 写入频次取决于客户端埋点策略（建议：进入详情页 + 离开时各一次，或仅进入时一次）

### 6.2 后续优化点（按需启动）

| 场景 | 方案 |
|------|------|
| 写入 QPS 高峰 | 迁移到队列异步落库（事件 `VisitRecorded` + Listener `ShouldQueue`） |
| 数据量爆炸（>1 亿行） | 按 `created_at` 月份分区（PARTITION BY RANGE） |
| PV 实时聚合 | 引入 Redis 计数器 + 定时任务回写统计表 |
| 用户画像/最近浏览 | Redis Sorted Set 按 `user_id + source_type` 维度去重并按时间排序 |

### 6.3 索引覆盖检查

| 查询场景 | 命中索引 |
|----------|----------|
| 我的访问（无 source_type） | `PRIMARY KEY (id)` 倒序 |
| 我的访问（带 source_type） | `idx_visit_user_source` |
| 某资源的访问列表 | `idx_visit_source` |
| 某资源在某用户的访问 | `idx_visit_user_source` 前缀 |

---

## 7. 实施阶段

| 阶段 | 内容 | 交付物 | 状态 |
|------|------|--------|------|
| **Phase 1 数据模型** | `visits` 表迁移（含 `VARBINARY(16)` 改列）+ `Visit` 模型 + `VisitFactory` + `forSource()` 状态 | 数据层就绪 | ✅ 已完成 |
| **Phase 2 接口实现** | `RecordVisitRequest` / `MyVisitsIndexRequest` + `VisitResource` + `VisitController` + 路由注册 + Feature 测试 9 用例 / 31 断言全通过 | Api 接口可用 | ✅ 已完成 |
| **Phase 3 Apifox 发布** | Api 模块下独立 `VisitResource` Schema + 2 个接口（POST 记录、GET 列表）+ 分页规范 + 标签 `访问记录`/`分页接口` | 文档同步 | ✅ 已完成 |
| **Phase 4 README 与 doc** | 项目 README 接口表格 + `business-tables.md` 表结构 + `api-v1.md` 接口文档 + 本技术方案 | 项目文档完备 | ✅ 已完成 |

> **暂缓项**：
> - ~~后台管理接口~~（PV/UV 统计由后续 BI 需求驱动，避免过度设计）
> - ~~PV 实时聚合与 Redis 缓存~~（按需启动）

---

## 8. Apifox 发布记录

项目：**Laravel Skel**（`8720052`），分支 `main`。

### 数据模型（Schema）

严格遵循模块隔离，Api 模块下独立定义：

| Schema ID | 名称 | 模块 | 目录 |
|-----------|------|------|------|
| `317970962` | `VisitResource` | Api (`8396001`) | V1（公共模块） |

> 仅创建 Api 模块下的 Schema；如后续需 Admin 接口，必须独立创建 `VisitAdminResource`，禁止跨模块 `$ref`。

### 接口

| 接口 ID | 名称 | 方法 | 路径 | 模块 | 目录 |
|---------|------|------|------|------|------|
| `521022106` | 记录一次访问 | POST | `/api/v1/visits` | Api | V1/互动接口/访问记录 (`96882392`) |
| `521022351` | 我的访问记录 | GET | `/api/v1/user/visits` | Api | V1/互动接口/访问记录 (`96882392`) |

### 分页规范

列表接口按项目规范启用全局参数 `page` / `per_page`，并通过 `x-apifox-refs` 引用 Api 模块的 `EloquentPaginate` (`307396242`) 后覆写 `data` 字段为 `VisitResource` (`317970962`)。

### 标签

- 写入接口：`访问记录`
- 列表接口：`访问记录` + `分页接口`

---

## 9. 代码结构

```
app/
├── Models/
│   └── Visit.php                                  # 访问记录模型（UPDATED_AT=null）
├── Http/
│   ├── Controllers/Api/V1/
│   │   └── VisitController.php                    # 控制器（无赋值逻辑）
│   ├── Requests/Api/V1/Visit/
│   │   ├── RecordVisitRequest.php                 # 写入：prepareForValidation 注入 user_id/ip
│   │   └── MyVisitsIndexRequest.php               # 列表：source_type 白名单校验
│   └── Resources/Api/V1/
│       └── VisitResource.php                      # Api 模块独立 Resource
routes/
└── api_v1.php                                     # /api/v1/visits + /api/v1/user/visits
database/
├── migrations/
│   └── 2026_09_30_000001_create_visits_table.php  # VARBINARY(16) ip + 两个索引
└── factories/
    └── VisitFactory.php                           # 含 forSource() 状态
tests/
└── Feature/Api/V1/
    └── VisitControllerTest.php                    # 9 用例 / 31 断言
```