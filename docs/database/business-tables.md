# 业务数据表

## 1. 数据字典表

### 1.1 字典类型表 (dicts)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键 |
| name | VARCHAR | 字典名称 |
| code | VARCHAR | 字典编码（唯一） |
| status | TINYINT | 状态（0 禁用，1 启用） |
| sort | INT | 排序权重（越小越靠前） |
| remark | VARCHAR | 备注 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 1.2 字典数据表 (dict_items)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键 |
| dict_id | BIGINT | 所属字典 ID |
| label | VARCHAR | 字典项标签 |
| value | VARCHAR | 字典项值 |
| label_type | VARCHAR | 标签样式（default/primary/success/warning/danger/info，对应 Element Plus Tag type） |
| status | TINYINT | 状态（0 禁用，1 启用） |
| sort | INT | 排序权重 |
| remark | VARCHAR | 备注 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

> 删除字典时通过模型 `booted` 事件级联删除其所有字典项。

## 2. 应用发布表 (app_releases)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键 |
| name | VARCHAR | 应用名称 |
| slug | VARCHAR | 应用唯一标识（客户端传参用） |
| description | VARCHAR | 应用描述 |
| icon | VARCHAR | 应用图标 URL |
| sort | INT | 排序权重 |
| status | BOOLEAN | 启用状态 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |
| deleted_at | TIMESTAMP | 删除时间（软删除） |

## 3. 应用版本表 (app_versions)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键 |
| app_release_id | BIGINT | 所属应用 ID |
| platform | VARCHAR | 平台（android/ios/harmony，枚举 AppPlatform） |
| version | VARCHAR | 语义化版本号（如 1.2.0） |
| build | INT | 构建号（整数递增，用于版本比较） |
| download_url | VARCHAR | 安装包下载地址 |
| release_notes | TEXT | 更新说明 |
| min_supported_version | VARCHAR | 最低支持版本号 |
| min_supported_build | INT | 最低支持构建号（低于此构建号需强制更新） |
| force_update | BOOLEAN | 是否强制更新 |
| file_size | BIGINT | 安装包大小（字节） |
| file_hash | VARCHAR | 文件哈希（校验用） |
| status | VARCHAR | 发布状态（draft/published/withdrawn/obsolete，枚举 ReleaseStatus） |
| published_at | TIMESTAMP | 发布时间 |
| created_by | BIGINT | 创建人管理员 ID |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |
| deleted_at | TIMESTAMP | 删除时间（软删除） |

> 发布版本时会自动将同应用同平台下其他已发布版本置为 `obsolete`；已发布状态的版本不可删除，需先撤回或废弃。

**版本状态流转**：`draft` → `published`（publish）→ `withdrawn`（withdraw）/ `obsolete`（obsolete 或被新版本自动替换）。

## 4. 内容互动表

### 4.1 点赞表 (likes)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint | 主键 |
| user_id | bigint | 点赞用户 |
| source_type / source_id | string / bigint | 多态目标（morphs） |
| extra | json | 扩展信息 |
| created_at / updated_at | timestamp | 时间戳 |

- 唯一约束 `uniq_user_like`：`user_id + source_type + source_id`，同一用户对同一资源只能点赞一次
- 模型事件：`created` 时对目标 `like_count` 自增，`deleted` 时自减

### 4.2 收藏表 (collections)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint | 主键 |
| user_id | bigint | 收藏用户 |
| source_type / source_id | string / bigint | 多态目标（morphs） |
| extra | json | 扩展信息 |
| created_at / updated_at | timestamp | 时间戳 |

- 唯一约束 `uniq_user_collection`：`user_id + source_type + source_id`
- 模型事件：`created` 时对目标 `collection_count` 自增，`deleted` 时自减

### 4.3 评论表 (comments)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint | 主键 |
| user_id | bigint | 评论用户 |
| source_type / source_id | string / bigint | 多态目标（自关联可实现楼层回复） |
| is_top | boolean | 是否置顶 |
| status | string | 审核状态 |
| like_count / comment_count | int | 点赞数 / 回复数 |
| content | string(1000) | 评论内容 |
| mentioned_users | json | 艾特用户 ID 列表 |
| ip_address | ip | 评论 IP |
| created_at | timestamp | 评论时间（无 `updated_at`） |

### 4.4 互动能力 Trait

被互动的业务模型通过 trait 接入，目标表需自备对应计数列：

| Trait | 提供方法 | 依赖计数列 |
|-------|---------|-----------|
| `HasLikeable` | `likes()`、`isLikedBy($user)` | `like_count` |
| `HasCollectionable` | `collections()`、`isCollectedBy($user)` | `collection_count` |
| `HasCommentable` | `comments()` | `comment_count` |

- `source_type` 仅接受 `config/morph_maps.php` 中注册的多态别名
- 计数列由模型事件自动维护，接入前须确认目标表已有对应字段
- **评论楼层回复约定**：当 `source_type = 'comment'` 时表示本条为对另一条评论的回复，`source_id` 即父评论 ID；顶级评论的 `source_type` 指向业务实体（如 `user`、`post`）。后台判定回复关系与查询回复链均基于此约定，无需额外 `parent_id` 字段

### 4.5 访问记录表 (visits)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigint | 主键 |
| user_id | bigint | 访问用户 |
| source_type / source_id | string(255) / bigint | 多态目标（无 morphs，自行维护） |
| ip | varbinary(16) | 访问 IP（与 `login_histories` 一致，支持 IPv4/IPv6） |
| created_at | timestamp | 访问时间（无 `updated_at`，append-only） |

- 索引：`idx_visit_source`(`source_type`,`source_id`)、`idx_visit_user_source`(`user_id`,`source_type`,`source_id`)
- **不做唯一约束**：同一用户对同一资源可重复记录访问（PV 语义）
- 仅 Api 模块提供记录与查询接口，Admin 后台暂不实现
- 模型 `Visit` 关闭 `updated_at`，仅 `created_at` 由数据库 `CURRENT_TIMESTAMP` 填充

## 5. 钱包相关表（真实货币）

> 设计原则：**余额热数据落在持有者主表字段上（查询零 Join），记录层全部多态**。
> 未来其他模型（如 `admin_users`、未来的 `merchants`）需要支持钱包时，只需在其表追加 `balance` / `frozen_balance` 两个字段并 `use HasWalletBalance`，记录层无需任何改动。

### 5.1 钱包流水表 (wallet_trades)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键（从 10000000 起） |
| owner_type | VARCHAR(64) | 持有者类型（多态，取 `config/morph_maps.php` 别名，如 `user`） |
| owner_id | BIGINT | 持有者 ID |
| amount | DECIMAL(16,2) | 本次变动金额（正增负减） |
| before_balance | DECIMAL(16,2) | 变动前可用余额快照 |
| after_balance | DECIMAL(16,2) | 变动后可用余额快照 |
| before_frozen | DECIMAL(16,2) | 变动前冻结余额快照 |
| after_frozen | DECIMAL(16,2) | 变动后冻结余额快照 |
| type | VARCHAR(32) | 交易类型（枚举 `WalletTradeType`） |
| source_type | VARCHAR(64) | 业务来源类型（多态，如订单、提现单） |
| source_id | BIGINT | 业务来源 ID |
| status | VARCHAR(20) | 流水状态（pending/success/failed） |
| description | VARCHAR(255) | 交易描述 |
| created_at | TIMESTAMP | 交易时间 |

**索引**：`(owner_type, owner_id, created_at)` 复合索引、`(source_type, source_id)` 复合索引、`type` 索引。

> 冻结/解冻操作只变动冻结余额而不动可用余额，因此必须同时保留 `before_frozen` / `after_frozen` 快照，否则无法完整审计对账。

### 5.2 充值订单表 (recharges)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键 |
| owner_type / owner_id | VARCHAR(64) / BIGINT | 持有者（多态） |
| order_no | VARCHAR(64) | 订单号（唯一，前缀 `R` + 日期 + 随机串） |
| amount | DECIMAL(16,2) | 充值金额 |
| bonus_amount | DECIMAL(16,2) | 赠送金额（按 `wallet.recharge_bonus_rate` 计算） |
| pay_channel | VARCHAR(32) | 支付渠道（manual/wechat/alipay/apple，当前仅 manual 可用） |
| pay_status | VARCHAR(20) | 支付状态（pending/success/failed/expired/closed） |
| transaction_id | VARCHAR(128) | 渠道流水号（唯一，防重复入账；手动确认为空） |
| confirmed_by | BIGINT | 手动确认到账的管理员 ID |
| paid_at | TIMESTAMP | 支付完成时间 |
| expired_at | TIMESTAMP | 订单过期时间（默认创建后 30 分钟） |
| client_ip | VARCHAR(45) | 下单 IP |
| remark | VARCHAR(255) | 备注 |
| callback_payload | JSON | 渠道原始回调报文（渠道接入后使用） |
| created_at / updated_at | TIMESTAMP | 时间戳 |

**索引**：`order_no` 唯一索引、`transaction_id` 唯一索引、`(owner_type, owner_id, created_at)` 复合索引、`pay_status` 索引、`expired_at` 索引。

### 5.3 提现申请表 (withdraws)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键（从 10000000 起） |
| owner_type / owner_id | VARCHAR(64) / BIGINT | 持有者（多态，别名 `user`） |
| order_no | VARCHAR(64) | 提现单号（唯一，前缀 `W` + YmdHis + 6 位随机） |
| amount | DECIMAL(16,2) | 申请提现金额 |
| fee | DECIMAL(16,2) | 手续费（按 `wallet.withdraw_fee_rate` 百分比计算，默认 0） |
| actual_amount | DECIMAL(16,2) | 实际到账金额（amount - fee） |
| account_type | VARCHAR(32) | 收款账户类型（枚举 `WithdrawAccountType`：wechat/alipay/bank） |
| account_info | JSON | 收款账户信息（账号、姓名等，响应脱敏展示） |
| status | VARCHAR(20) | 状态（枚举 `WithdrawStatus`，默认 pending） |
| reviewed_by | BIGINT | 审核管理员 ID（nullable） |
| reviewed_at | TIMESTAMP | 审核时间（nullable） |
| reject_reason | VARCHAR(255) | 驳回原因（nullable） |
| transfer_at | TIMESTAMP | 打款完成时间（nullable） |
| fail_reason | VARCHAR(255) | 打款失败原因（nullable） |
| remark | VARCHAR(255) | 管理员备注（nullable） |
| client_ip | VARCHAR(45) | 下单 IP（nullable） |
| created_at / updated_at | TIMESTAMP | 时间戳 |

**索引**：`order_no` 唯一索引、`idx_withdraw_owner_at (owner_type, owner_id, created_at)` 复合索引、`idx_withdraw_status (status)`。

**状态流转**：`pending` →（审核通过）`approved` →（打款成功）`success`；`pending` →（审核驳回）`rejected`（自动解冻）；`approved` →（打款失败）`failed`（自动解冻）。`rejected`/`success`/`failed` 为终态。

### 5.4 钱包相关枚举

**WalletTradeType（钱包交易类型）**：

| 值 | 说明 |
|----|------|
| recharge | 充值 |
| withdraw | 提现 |
| freeze | 冻结 |
| unfreeze | 解冻 |
| payment | 消费 |
| refund | 退款 |
| admin_recharge | 后台充正 |
| admin_deduct | 后台扣减 |

**WithdrawStatus（提现状态）**：

| 值 | 说明 |
|----|------|
| pending | 待审核 |
| approved | 审核通过，待打款 |
| rejected | 已驳回（自动解冻退回） |
| success | 打款成功（结算冻结，资金流出） |
| failed | 打款失败（自动解冻退回） |

**WithdrawAccountType（收款账户类型）**：

| 值 | 说明 |
|----|------|
| wechat | 微信 |
| alipay | 支付宝 |
| bank | 银行卡 |

**与现有积分/金币体系的关系**：钱包是独立的**真实货币**账本，与现有 `available_points`（积分）、`available_coins`（金币）两套虚拟资产体系**并行且互不影响**，本期不做迁移或合并。

## 6. 虚拟资产流水表

| 表名 | 说明 |
|------|------|
| coin_trades | 金币流水记录 |
| point_records | 积分记录 |
| point_trades | 积分流水记录 |

## 7. 实名认证表 (identity_verifications)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键 |
| verifiable_type | VARCHAR(100) | 申请人类型（多态） |
| verifiable_id | BIGINT | 申请人 ID |
| type | VARCHAR(16) | 认证类型（personal 个人 / enterprise 企业） |
| status | VARCHAR(16) | 审核状态（pending/review/approved/rejected，默认 pending） |
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
| expires_at | TIMESTAMP | 认证有效期（通过后自动 +3 年） |
| created_at / updated_at | TIMESTAMP | 时间戳 |

**索引**：`(verifiable_type, verifiable_id)` 复合索引、`type` 索引、`status` 索引、`admin_id` 索引。

> 敏感字段（`id_card_no`、`legal_person_id_card_no`、`bank_account`）通过模型 `#[Hidden]` 在所有响应中自动隐藏。驳回原因通过预置字典 `identity_reject_reason` 管理，迁移时自动 seed。

**users 表关联字段**：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| identity_type | VARCHAR(16) | 实名认证类型（personal/enterprise），null 表示未认证 |
| identity_status | VARCHAR(16) | 实名认证状态（默认 unsubmitted，索引） |

> 用户表直接存储认证状态热数据，查询零 Join。`identity_verified` 为逻辑属性，由 `identity_status === approved` 派生。

详见 [实名认证技术方案](/technical-solutions/identity-verification)。

## 8. 用户分群表

### 8.1 分群定义表 (user_segments)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键（从 10000000 起） |
| code | VARCHAR(64) | 分群编码（规则分群必填且唯一，手动可空） |
| name | VARCHAR(64) | 分群名称 |
| label_type | VARCHAR(16) | 标签样式（default/primary/success/warning/danger/info） |
| type | TINYINT | 分群类型（1=手动，2=规则） |
| group | VARCHAR(32) | 分组（用户画像/运营分群/风控 等） |
| description | VARCHAR(500) | 分群说明 |
| sort | INT | 排序权重（越小越靠前） |
| status | BOOLEAN | 启用状态（0=禁用，1=启用） |
| rule | JSON | 规则定义（仅 type=2 有效，结构含 version/logic/conditions） |
| last_synced_at | TIMESTAMP | 最近一次规则刷新时间 |
| last_synced_user_count | INT | 最近一次规则匹配用户数 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**索引**：`code` 唯一索引、`type` 索引、`group` 索引、`status` 索引。

### 8.2 分群成员表 (user_segment_memberships)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键 |
| segment_id | BIGINT | 分群 ID（外键，级联删除） |
| user_id | BIGINT | 用户 ID（外键，级联删除） |
| source | TINYINT | 打标来源（1=手动，2=规则） |
| created_at | TIMESTAMP | 打标时间 |

**索引**：`uniq_segment_user` 唯一约束（segment_id + user_id）、`idx_user_segment`（user_id + segment_id）、`idx_segment_source_time`（segment_id + source + created_at）。

> 用户软删时通过 `UserObserver` 自动清理分群成员记录。规则同步增量 diff 仅操作 `source=2` 的成员，不影响手动打标的成员。

### 8.3 分群异步任务表 (segment_tasks)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键 |
| admin_id | BIGINT | 提交任务的管理员 ID |
| type | VARCHAR(32) | 任务类型（attach 打标 / detach 解标） |
| payload | JSON | 任务载荷（segment_ids + user_ids） |
| total_count | INT | 计划处理总数 |
| processed_count | INT | 已处理数 |
| added_count | INT | 实际新增/解绑数 |
| status | VARCHAR(16) | 状态（pending/running/completed/failed） |
| error_message | VARCHAR(1000) | 失败原因 |
| started_at | TIMESTAMP | 开始执行时间 |
| finished_at | TIMESTAMP | 完成时间 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**索引**：`admin_id` 索引、`type` 索引、`status` + `created_at` 复合索引。

> 当批量打标/解标操作超过 `BATCH_LIMIT=1000` 时自动创建任务记录并派发 `BulkSegmentTaskJob`，任务完成后发送站内信通知管理员。

## 9. 举报表 (reports)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键 |
| user_id | BIGINT | 举报人用户 ID |
| reportable_id | BIGINT | 被举报对象 ID |
| reportable_type | VARCHAR(255) | 被举报对象多态类型（morph alias：`comment` / `user`，由 `Relation::enforceMorphMap()` 全局别名统一管理） |
| category | VARCHAR(32) | 举报分类（取自字典 `report_category`） |
| reason | VARCHAR(500) | 举报描述（可空） |
| evidence | JSON | 证据图片 URL 数组（可空） |
| status | VARCHAR(16) | 处理状态（pending/processing/resolved/rejected） |
| handler_id | BIGINT | 处理人管理员 ID（可空） |
| process_remark | VARCHAR(500) | 处理备注（可空） |
| process_actions | JSON | 处置动作记录（可空，格式见 §10） |
| processed_at | TIMESTAMP | 处理时间（可空） |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间（列存在，但模型声明 `UPDATED_AT = null` 不自动维护，值恒为 NULL） |

**索引**：
- 主键
- `reportable_type + reportable_id` 复合索引（多态查询）
- `status + category + created_at` 复合索引（筛选）
- `handler_id + processed_at` 复合索引（按处理人查询）
- `user_id + status` 复合索引（用户自己的举报列表）

**字典**：`report_category`（举报分类），固定 9 项：色情低俗、暴力血腥、政治敏感、广告营销、辱骂人身攻击、虚假信息、侵权抄袭、违法违规、其他。

**唯一性约束**：业务层校验同一 `(user_id, reportable_type, reportable_id)` 在 `pending`/`processing` 状态下不可重复提交，数据库层不强制。

## 10. process_actions JSON 协议

`reports.process_actions` 为 JSON 数组，每项结构：

```json
[
  { "type": "hide_comment", "reason": null },
  { "type": "delete_comment", "reason": null },
  { "type": "freeze_user", "reason": null }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | 处置动作类型：`hide_comment` / `delete_comment` / `freeze_user` |
| reason | string \| null | 动作说明（可空） |

## 11. 系统基础表

| 表名 | 说明 |
|------|------|
| sessions | 会话存储 |
| cache / cache_locks | 缓存/缓存锁 |
| jobs / job_batches / failed_jobs | 队列任务/批次/失败任务 |
| pulse_values / pulse_entries / pulse_aggregates | Laravel Pulse 监控数据 |

## 12. AI 知识库表

### 12.1 知识库文档表 (knowledge_documents)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键 |
| title | VARCHAR(200) | 文档标题 |
| content | LONGTEXT | 文档原始内容 |
| status | VARCHAR(20) | 索引状态（pending/processing/ready/failed，枚举 KnowledgeDocumentStatus），带索引 |
| is_enabled | BOOLEAN | 是否启用（停用的文档不参与检索） |
| chunks_count | UNSIGNED INT | 分块数量 |
| tokens | UNSIGNED INT | 向量化消耗的 Tokens |
| error | VARCHAR(500) | 最近一次索引失败原因（可空） |
| created_by | BIGINT | 创建管理员 ID（可空，带索引） |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

> 文档保存后自动派发 `ProcessKnowledgeDocumentJob` 异步索引任务（段落分块 + Embedding 向量化）；内容变更自动重建，亦可手动 reindex。索引状态流转：`pending` → `processing` → `ready`/`failed`。

### 12.2 知识库文档分块表 (knowledge_chunks)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGINT | 主键 |
| document_id | BIGINT | 所属文档 ID（外键级联删除，带索引） |
| content | TEXT | 分块文本内容 |
| embedding | JSON | 向量（JSON 数组，维度由配置的 Embedding 模型决定，默认 2048） |
| tokens | UNSIGNED INT | 该分块向量化消耗的 Tokens |
| sort | UNSIGNED SMALLINT | 分块在文档内的顺序 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

> 语义检索时将查询文本向量化，与分块向量做余弦相似度计算，按得分降序返回 Top-N；仅召回「已完成索引且启用」文档的分块。

---

> 文档来源：PRD 第 5.1 节
