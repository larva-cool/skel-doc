# 前台 API v1 接口（/api/v1）

> 在线接口文档（Apifox，可在线调试）：<https://s.apifox.cn/beffd1da-1021-434c-8f13-8cbf50a3f406>

## 1. 用户认证与账户

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/login` | 用户登录（密码/手机验证码/微信/Apple） |
| POST | `/api/v1/auth/register` | 用户注册（手机/邮箱） |
| POST | `/api/v1/auth/logout` | 退出登录 |
| GET | `/api/v1/auth/info` | 当前用户信息 |

## 2. 公共接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/common/*` | 公共接口（短信/邮件验证码、地区等） |
| POST | `/api/v1/common/sms-captcha` | 发送短信验证码 |
| POST | `/api/v1/common/mail-captcha` | 发送邮件验证码 |

## 3. 应用版本

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/apps/check-update` | App 版本检查更新（传 slug/platform/build，返回是否有更新、是否强制、最新版本信息） |

## 4. 用户个人中心

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/user/*` | 用户个人中心（资料、密码、通知、积分、金币、登录历史等） |
| GET | `/api/v1/user` | 获取基本资料 |
| POST | `/api/v1/user/profile` | 修改个人资料 |
| POST | `/api/v1/user/avatar` | 修改头像（multipart/form-data，字段 `avatar`，自动转 WebP） |
| POST | `/api/v1/user/username` | 修改用户名 |
| POST | `/api/v1/user/password` | 修改密码 |
| POST | `/api/v1/user/phone` | 修改手机号 |
| POST | `/api/v1/user/email` | 修改邮箱 |
| POST | `/api/v1/user/verification-mail` | 发送验证邮件 |
| DELETE | `/api/v1/user` | 注销并删除自己的账户 |
| GET | `/api/v1/user/notifications` | 通知列表 |
| GET | `/api/v1/user/login-histories` | 登录历史 |
| GET | `/api/v1/user/socials` | 当前用户绑定的第三方账号列表（分页，可按 `provider` 过滤；openid/unionid 脱敏） |
| GET | `/api/v1/user/identity` | 当前用户最新一条实名认证记录 |
| GET | `/api/v1/user/identity/status` | 简要实名认证状态 |
| POST | `/api/v1/user/identity` | 提交/重新提交实名认证（personal 个人 / enterprise 企业） |
| GET | `/api/v1/user/addresses` | 收货地址列表 |
| POST | `/api/v1/user/addresses` | 新增收货地址 |
| PUT | `/api/v1/user/addresses/{id}` | 更新收货地址 |
| DELETE | `/api/v1/user/addresses/{id}` | 删除收货地址 |

### 4.1 修改头像（POST `/api/v1/user/avatar`）

- 需 Sanctum 登录认证，请求格式为 `multipart/form-data`

| 表单字段 | 类型 | 必填 | 说明 |
|----------|------|------|------|
| `avatar` | file | 是 | 头像图片，支持 jpg/jpeg/png/gif |

服务端处理：图片经 Intervention 统一转换为 WebP（质量 60），以用户 ID 命名（`{id}.webp`），按 ID 补零 9 位分两级目录存储（`avatar/000/0000/{id}.webp`），重复上传直接覆盖旧头像；上传结果写入附件台账，更新资料后派发 `UserProfileUpdated` 事件（驱动完善资料任务进度）。

成功响应 `200`：

```json
{
  "message": "头像修改完成",
  "path": "avatar/000/0000/1.webp",
  "avatar": "avatar/000/0000/1.webp"
}
```

错误响应：未登录返回 `401`；未传文件或文件类型不合法返回 `422`（`errors.avatar` 含具体校验信息）。

## 5. 内容互动接口

### 5.1 点赞（/api/v1/likes）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/likes` | 我的点赞列表（分页，可按 `source_type` 过滤） |
| POST | `/api/v1/likes` | 添加点赞 |
| DELETE | `/api/v1/likes/{like}` | 取消点赞 |

### 5.2 收藏（/api/v1/collections）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/collections` | 我的收藏列表（分页，可按 `source_type` 过滤） |
| POST | `/api/v1/collections` | 添加收藏 |
| DELETE | `/api/v1/collections/{collection}` | 取消收藏 |

### 5.3 关注（/api/v1/follows）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/follows` | 我的关注列表（分页，可按 `source_type` 过滤） |
| POST | `/api/v1/follows` | 添加关注 |
| DELETE | `/api/v1/follows/{follow}` | 取消关注 |

### 5.4 评论（/api/v1/comments）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/comments` | 评论列表（分页，可按 `source_type` + `source_id` 过滤；公开接口） |
| POST | `/api/v1/comments` | 发布评论（支持 `parent_id` 回复、`mentioned_users` 艾特） |
| DELETE | `/api/v1/comments/{comment}` | 删除评论（仅本人） |

### 5.5 访问记录（/api/v1/visits）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/visits` | 记录一次访问（`user_id` / `ip` 由后端注入，前端仅传 `source_type` + `source_id`） |
| GET | `/api/v1/user/visits` | 我的访问记录（分页，可按 `source_type` 过滤） |

- 两条接口均需 Sanctum 认证；写入接口由 `RecordVisitRequest::prepareForValidation()` 合并 `user_id` 与 `ip`，控制器不直接拼装
- 资源校验复用现有 `source_types()` 白名单（同 Like/Collection），`source_type` 命中多态别名之外的值返回 `422`
- **不做唯一约束**：同一用户对同一资源可重复访问，符合 PV 语义

### 5.6 内容互动约定

- 点赞、收藏、关注、访问记录全部接口需 Sanctum 认证；评论仅 `POST`/`DELETE` 需认证，列表公开
- 写入参数：`source_type`（必填，须为 `config/morph_maps.php` 已注册别名）、`source_id`（必填）、`extra`（可选，JSON，仅点赞/收藏/关注使用）
- 点赞/收藏/关注对同一资源重复提交返回 `422`，由 `Rule::unique` 拦截
- 越权删除他人记录返回 `403`，由 `LikePolicy` / `CollectionPolicy` / `FollowPolicy` / `CommentPolicy` 校验
- 响应中的 `user_id` 通过模型 `#[Hidden]` 隐藏
- 列表接口使用 Laravel 标准分页，支持 `page` / `per_page`（1-100，默认 15）

## 6. 公告

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/announcements` | 公告列表 |
| GET | `/api/v1/announcements/{id}` | 公告详情 |

## 7. 协议

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/agreements/{category}` | 按类别获取最新已发布协议（公开，带 HTTP 缓存） |

> 前端传入协议类别编码（如 `user_agreement`、`privacy_policy`），返回该类别最新已发布版本的完整内容（含 title、content、version、effective_at）。

## 8. Banner

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/banners` | 获取公开 Banner 列表（自动过滤禁用/未开始/已过期） |

## 9. 用户反馈（/api/v1/user/feedbacks）

> 全部接口需 Sanctum 登录认证，反馈自动绑定当前登录用户（`user_id` 由服务端注入，无需客户端传）。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/user/feedbacks` | 提交用户反馈（成功返回 201，响应体含反馈单号 `code`） |
| GET | `/api/v1/user/feedbacks/my` | 我的反馈列表（分页，按提交时间倒序） |

## 9b. 用户举报（/api/v1/user/reports）

> 全部接口需 Sanctum 登录认证，举报自动绑定当前登录用户。被举报对象使用 `morph_alias` (`comment` / `user`) 接收，服务端按 morphMap 解析为全限定类名并校验目标存在。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/user/reports` | 提交举报。Body：`target_type` ∈ `comment`/`user`、`target_id`、`category`（取自字典 `report_category`，9 类）、可选 `reason`（≤500 字）、可选 `evidence`（≤9 个 URL）。成功返回 201。同一人对同一目标在 `pending`/`processing` 状态下不可重复提交（返回 422）。`reason` 内容会经过敏感词过滤。目标对象不存在返回 422 |
| GET | `/api/v1/user/reports/my` | 我的举报列表（分页，按提交时间倒序） |

## 10. 钱包接口（/api/v1/user/wallet）

| 方法 | 路径 | 说明 | 状态 |
|------|------|------|------|
| GET | `/api/v1/user/wallet` | 我的钱包概览（可用余额、冻结余额、累计收入、累计支出） | ✅ 已交付 |
| GET | `/api/v1/user/wallet/trades` | 我的钱包流水（分页，可按 `type`/时间范围过滤） | ✅ 已交付 |
| POST | `/api/v1/user/wallet/recharges` | 创建充值订单（返回 `order_no`，成功返回 201） | ✅ 已交付 |
| GET | `/api/v1/user/wallet/recharges` | 我的充值订单列表（分页，可按 `pay_status` 过滤） | ✅ 已交付 |
| GET | `/api/v1/user/wallet/recharges/{recharge}` | 充值订单详情（用于轮询到账状态） | ✅ 已交付 |
| POST | `/api/v1/user/wallet/withdraws` | 提交提现申请（`amount`、`account_type`∈wechat/alipay/bank、`account_info:{account,real_name}`，成功返回 201，冻结对应金额） | ✅ 已交付 |
| GET | `/api/v1/user/wallet/withdraws` | 我的提现列表（分页，可按 `status` 过滤，收款账号脱敏） | ✅ 已交付 |
| GET | `/api/v1/user/wallet/withdraws/{withdraw}` | 提现详情（Policy 校验归属，收款账号脱敏） | ✅ 已交付 |

### 钱包接口约定

- 全部接口需 Sanctum 认证，内部统一取 `auth()->user()` 作为 owner，前台无需感知多态
- 充值下单走 `wallet.recharge_throttle` 限流，提现提交走 `wallet.withdraw_throttle`（默认 5 次/分钟），防止刷单
- 越权访问他人订单返回 `403`，由 `RechargePolicy` / `WithdrawPolicy` 校验
- 提现提交需校验：开关（`wallet.enable_withdraw`）、金额区间（`wallet.min_withdraw_amount`/`wallet.max_withdraw_amount`）、当日次数（`wallet.daily_withdraw_limit`）、不存在待审核单；余额不足返回 `422`
- 金额字段统一以元为单位、`decimal(16,2)` 精度返回字符串，避免前端浮点精度丢失
- 前台提现响应使用 `Api\V1\WithdrawResource`，脱敏展示，不返回 `owner`、`client_ip`、`reviewed_by`、`remark` 等内部字段
- 支付渠道对接已挂起，`pay_channel` 当前仅接受 `manual`，到账由管理员在后台确认

## 11. 字典公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/dict-items` | 公开字典项查询（按 code 获取字典数据） |

## 12. 支付回调（/callback）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/callback/pay/wechat` | 微信支付异步回调（验签后置订单成功并入账） |
| POST | `/callback/pay/alipay` | 支付宝异步回调（验签后置订单成功并入账） |

回调接口豁免 CSRF 与认证中间件，必须完成渠道验签；处理逻辑幂等（同一 `order_no` 重复回调只入账一次）。

## 13. MCP Server（/mcp/v1）

将上述 C 端接口能力封装为 MCP（Model Context Protocol）工具，供 AI 客户端直接调用。采用进程内封装：工具直接调用业务层/模型，不经过 HTTP 转发。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/mcp/v1` | MCP JSON-RPC 2.0 端点（Sanctum Token 认证） |

### 接入方式

- 请求头：`Authorization: Bearer <Sanctum 个人访问令牌>`，与 `/api/v1` 共用同一套用户令牌
- Content-Type：`application/json`，请求体为 JSON-RPC 2.0（`tools/list`、`tools/call` 等）
- 未认证返回 `401`；工具入参校验失败在 JSON-RPC 响应中返回校验错误信息

### 客户端配置示例

```json
{
  "mcpServers": {
    "skel-api": {
      "type": "http",
      "url": "https://laravel-skel-forge.test/mcp/v1",
      "headers": { "Authorization": "Bearer <token>" }
    }
  }
}
```

### 已封装工具（70 个：35 只读 + 35 写操作）

| 域 | 工具名 | 说明 | 入参 |
|--------|------|------|------|
| 用户 | `user.profile.get` | 基本资料（账号、昵称、头像、积分、金币、会员状态） | 无 |
| 用户 | `user.login_histories.list` | 登录历史 | 分页 |
| 用户 | `user.points.list` | 积分流水 | 分页 |
| 用户 | `user.coins.list` | 金币流水 | 分页 |
| 用户 | `user.socials.list` | 第三方账号绑定（openid/unionid 脱敏） | 分页 + `provider` |
| 用户 | `user.visits.list` | 我的访问记录 | 分页 + `source_type` |
| 通知 | `user.notifications.list` | 通知列表 | 分页 + `type` |
| 通知 | `user.notifications.unread` | 未读通知列表 | 分页 + `type` |
| 地址 | `user.address.list` | 收货地址列表 | 分页 |
| 地址 | `user.address.get` | 地址详情（越权拦截） | `id` |
| 反馈 | `user.feedback.list` | 我的反馈列表 | 分页 |
| 举报 | `user.report.list` | 我的举报列表 | 分页 |
| 实名 | `user.identity.get` | 最新一条实名认证记录 | 无 |
| 实名 | `user.identity.status` | 实名认证简要状态 | 无 |
| 钱包 | `wallet.overview.get` | 钱包概览（余额、冻结、累计收支） | 无 |
| 钱包 | `wallet.trades.list` | 钱包流水 | 分页 + `type` / `start_date` / `end_date` |
| 钱包 | `wallet.recharge.list` | 充值订单列表 | 分页 + `pay_status` |
| 钱包 | `wallet.recharge.get` | 充值订单详情（越权拦截） | `id` |
| 钱包 | `wallet.withdraw.list` | 提现申请列表 | 分页 + `status` |
| 钱包 | `wallet.withdraw.get` | 提现详情（越权拦截） | `id` |
| 钱包 | `wallet.withdraw_account.list` | 收款账户列表（默认排最前） | 分页 + `account_type` |
| 内容互动 | `content.comment.list` | 已审核通过的公开评论列表 | 分页 + `source_type` / `source_id` |
| 内容互动 | `content.collection.list` | 我的收藏列表 | 分页 + `source_type` |
| 内容互动 | `content.like.list` | 我的点赞列表 | 分页 + `source_type` |
| 内容互动 | `content.follow.list` | 我的关注列表 | 分页 + `source_type` |
| 任务 | `task.list` | 任务中心（按分组返回，含当前用户进度） | 无 |
| 邀请 | `invite.record.list` | 我的邀请记录 | 分页 |
| 邀请 | `invite.stats.get` | 邀请统计（人数、是否有邀请人） | 无 |
| 公开 | `common.banner.list` | 指定广告位生效中的 Banner | `position` |
| 公开 | `common.area.list` | 地区列表（不传 `area_id` 返回省级） | `area_id`? |
| 公开 | `common.dict_item.list` | 公开字典项（白名单内编码） | `code` |
| 公开 | `common.announcement.list` | 已发布公告列表 | 分页 |
| 公开 | `common.announcement.get` | 公告详情 | `id` |
| 公开 | `common.agreement.get` | 最新已发布协议 | `category` |
| 会话 | `auth.token.list` | 已签发的访问令牌列表 | 分页 |

### 写操作工具（18 个）

| 域 | 工具名 | 说明 | 入参 |
|--------|------|------|------|
| 内容互动 | `content.comment.create` | 发布评论（敏感词过滤，命中 review 级别进入待审核） | `source_type` / `source_id` / `content` / `parent_id`? / `mentioned_users`? |
| 内容互动 | `content.comment.delete` | 删除自己的评论 | `id` |
| 内容互动 | `content.like.create` | 点赞（同一用户同一对象防重复） | `source_type` / `source_id` / `extra`? |
| 内容互动 | `content.like.delete` | 取消点赞 | `source_type` / `source_id` |
| 内容互动 | `content.collection.create` | 收藏（防重复） | `source_type` / `source_id` / `extra`? |
| 内容互动 | `content.collection.delete` | 取消收藏 | `source_type` / `source_id` |
| 内容互动 | `content.follow.create` | 关注（防重复） | `source_type` / `source_id` / `extra`? |
| 内容互动 | `content.follow.delete` | 取消关注 | `source_type` / `source_id` |
| 用户资料 | `user.profile.update` | 修改个人资料（昵称、生日、性别、地区、网站、介绍、签名） | 各字段可选 |
| 用户资料 | `user.username.update` | 修改用户名（全局唯一） | `username` |
| 用户资料 | `user.email.update` | 修改邮箱（需邮件验证码） | `email` / `verify_code` |
| 用户资料 | `user.phone.update` | 修改手机号（需短信验证码） | `phone` / `verify_code` |
| 用户资料 | `user.avatar.update` | 修改头像（base64 编码图片，自动转 WebP） | `avatar_base64` / `extension` |
| 用户资料 | `user.password.update` | 修改密码（需旧密码验证） | `old_password` / `password` |
| 地址 | `user.address.create` | 添加收货地址 | `name` / `phone` / `province` / `city` / `district` / `address` / `country`? / `is_default`? / `zipcode`? |
| 地址 | `user.address.update` | 修改收货地址 | `id` + 可选字段 |
| 地址 | `user.address.delete` | 删除收货地址（软删除） | `id` |
| 地址 | `user.address.set_default` | 设为默认地址 | `id` |
| 反馈 | `user.feedback.create` | 提交用户反馈（敏感词过滤） | `title` / `content` / `type` / `images`? / `contact_name`? / `contact_info`? |
| 举报 | `user.report.create` | 提交举报（同一对象未结案前不可重复） | `target_type` / `target_id` / `category` / `reason`? / `evidence`? |
| 钱包 | `wallet.recharge.create` | 创建充值订单（destructive） | `amount` / `pay_channel` |
| 钱包 | `wallet.withdraw.create` | 提交提现申请（destructive，冻结余额） | `amount` / `withdraw_account_id` |
| 钱包 | `wallet.withdraw_account.create` | 添加收款账户（首个自动默认） | `account_type` / `real_name` / `account_no` / `bank_name`? / `bank_branch`? / `is_default`? |
| 钱包 | `wallet.withdraw_account.update` | 修改收款账户 | `id` + 可选字段 |
| 钱包 | `wallet.withdraw_account.delete` | 删除收款账户（destructive） | `id` |
| 钱包 | `wallet.withdraw_account.set_default` | 设为默认收款账户 | `id` |
| 任务 | `task.claim` | 领取任务奖励 | `task_id` / `period_key`? |
| 通知 | `notification.mark_all_read` | 全部标记已读 | 无 |
| 通知 | `notification.mark_read` | 标记指定通知已读 | `id` |
| 通知 | `notification.clear_read` | 清空已读通知（不可恢复） | 无 |
| 访问记录 | `visit.record` | 记录一次访问 | `source_type` / `source_id` |
| 会话 | `auth.token.delete` | 撤销指定访问令牌 | `id` |
| 会话 | `auth.logout` | 退出登录（当前令牌立即失效） | 无 |
| 账户 | `user.delete` | 注销并删除账户（destructive，软删除） | 无 |

**写操作统一约定**：

- 涉及内容发布的工具（评论、资料介绍/签名、反馈、举报）自动经过敏感词过滤
- 点赞/收藏/关注工具内置防重复校验，重复调用返回错误
- 删除/详情工具仅能操作当前登录用户自己的数据，越权返回错误
- `user.email.update` / `user.phone.update` 需先通过 `/api/v1/common/mail-captcha` 或 `/api/v1/common/sms-captcha` 获取验证码
- 资金类（`wallet.recharge.create`、`wallet.withdraw.create`）与账户注销（`user.delete`）标记 `destructiveHint=true`，AI 客户端应在执行前向用户二次确认
- `wallet.withdraw.create` 会冻结对应金额，需确保用户余额充足；同一用户仅允许一笔待审核提现

**统一约定**：

- 「分页」入参为 `page`（默认 1）与 `per_page`（默认 15，1-100）；响应统一为 `{items: [...], pagination: {total, per_page, current_page, last_page, has_more}}`
- 详情类工具在记录不存在或不属于当前用户时返回错误（`isError=true`），不会越权泄漏他人数据
- 全部工具均带 `readOnlyHint` 与 `idempotentHint`，可由 AI 客户端安全缓存结果

- 工具定义位于 `app/Mcp/Tools/`，Server 定义位于 `app/Mcp/Servers/ApiServer.php`
- 调试：`php artisan mcp:inspector mcp/v1`

---

> 文档来源：PRD 第 6.4 节
