# AI 助手

基于 `laravel/ai` 集成的后台 AI 助手能力，为管理员提供智能对话和工具调用能力。

## 功能说明

| 功能 | 说明 |
|------|------|
| SSE 流式对话 | 以 Server-Sent Events 实时推送 AI 响应，支持思考过程（reasoning）和文本输出 |
| 工具调用 | AI 可调用内置工具查询数据或执行操作（审计日志查询、验证码查询、系统设置读写、仪表盘统计、地区查询、系统信息、用户管理与站内通知、钱包流水/充值/提现查询与提现审核、意见反馈查询与处理、实名认证查询与审核、公告/Banner/敏感词/评论/协议管理、用户分群同步、任务系统查询、队列失败任务查询与重试、定时任务查询、App 版本查询、字典查询、管理员/角色查询、举报处理、邀请记录查询、附件查询、开放平台账户管理与令牌轮换、网页抓取等） |
| 工具审批 | 敏感操作（如调整用户余额、VIP 延期、重置密码等）需管理员二次审批后继续执行 |
| 对话历史 | 按会话（Conversation）保存对话记录，支持查看历史会话、删除会话 |
| 权限控制 | 接口入口由 `chat.use` 权限点保护；工具按当前管理员角色权限动态过滤，越权调用在执行层兜底拒绝 |

## 权限控制

AI 助手与后台 RBAC（`spatie/laravel-permission`）深度集成，采用三层防线防止越权：

| 防线 | 位置 | 说明 |
|------|------|------|
| 入口控制 | `ChatController` | `permission:chat.use` 中间件，无权限的管理员无法使用任何 AI 助手接口（返回 403） |
| 工具过滤 | `Assistant::tools()` | 按当前对话管理员的权限点（`canAny`）动态过滤工具列表，无权限的工具不会暴露给模型；无对话参与者时按 deny-by-default 全部过滤 |
| 执行兜底 | 各工具 `handle()` | 工具装配时注入当前管理员，执行前 `authorizeAdmin()` 二次校验，即使模型被诱导发起越权调用也会被拒绝并返回提示文案 |

实现要点：

- 工具实现 `App\Ai\Contracts\RequiresPermission` 契约声明所需权限点（支持字符串或数组，数组任一满足即可）
- 授权能力由 `App\Ai\Tools\Concerns\AuthorizesAdmin` trait 提供（`forAdmin()` 注入 + `authorizeAdmin()` 校验）
- `chat.use` 权限点随 `ai.chat` 菜单同步注册（菜单 saved 事件自动写入 permissions 表，超级管理员角色自动获得）

## 内置 AI 工具

| 工具分类 | 工具名称 | 说明 | 所需权限 |
|---------|---------|------|---------|
| Apps | ListAppVersions | 查询 App 版本列表 | `app-versions.index` |
| Audit | ListAuditLogs | 查询后台操作日志 | `audit-logs.index` |
| Audit | ListLoginHistories | 查询登录历史 | `login-histories.index` |
| Audit | ListVerificationCodes | 查询验证码记录 | `phone-codes.index` 或 `mail-codes.index`（任一） |
| Content | HandleReport | 处理用户举报（需审批） | `reports.edit` |
| Content | ListComments | 查询用户评论 | `comments.index` |
| Content | ListReports | 查询用户举报 | `reports.index` |
| Content | ModerateComment | 审核评论（需审批） | `comments.edit` |
| Feedbacks | ListFeedbacks | 查询用户意见反馈 | `feedbacks.index` |
| Feedbacks | ReplyFeedback | 处理用户反馈（需审批） | `feedbacks.edit` |
| Open | ListOpenAccounts | 查询开放平台账户 | `open_accounts.index` |
| Open | RotateOpenAccountToken | 轮换开放平台账户令牌（需审批） | `open_accounts.edit` |
| Open | SetOpenAccountStatus | 启用/冻结开放平台账户（需审批） | `open_accounts.edit` |
| Operation | ListAgreements | 查询用户协议列表 | `agreements.index` |
| Operation | ListAnnouncements | 查询公告列表 | `announcements.index` |
| Operation | ListBanners | 查询 Banner 列表 | `banners.index` |
| Operation | PublishAnnouncement | 发布/归档公告（需审批） | `announcements.edit` |
| Operation | SetBannerStatus | 启用/禁用 Banner（需审批） | `banners.edit` |
| Operation | UpdateAgreement | 更新用户协议（需审批） | `agreements.edit` |
| Queue | ListFailedJobs | 查询队列失败任务 | `horizon.index` |
| Queue | RetryFailedJob | 重试队列失败任务（需审批） | `horizon.index` |
| Segments | ListUserSegments | 查询用户分群列表 | `segments.index` |
| Segments | SyncUserSegment | 同步规则分群成员（需审批） | `segments.edit` |
| Settings | GetSetting | 获取系统设置 | `settings.index` |
| Settings | SetSetting | 设置系统配置值（需审批） | `settings.edit` |
| Stats | GetDashboardStats | 获取仪表盘统计数据 | `chat.use` |
| System | AddSensitiveWord | 新增敏感词（需审批） | `sensitive-words.create` |
| System | GetAreas | 查询地区数据 | `areas.index` |
| System | ListAdmins | 查询后台管理员列表 | `admins.index` |
| System | ListAttachments | 查询附件列表 | `attachments.index` |
| System | ListDicts | 查询字典类型与字典数据 | `dicts.index` |
| System | ListRoles | 查询后台角色及权限构成 | `roles.index` |
| System | ListScheduleLogs | 查询定时任务执行日志 | `schedules.index` |
| System | ListSchedules | 查询定时任务定义 | `schedules.index` |
| System | ListSensitiveWords | 查询敏感词库 | `sensitive-words.index` |
| System | SystemInfo | 获取系统信息 | `chat.use` |
| Tasks | ListTaskLogs | 查询任务奖励发放日志 | `task-logs.index` |
| Tasks | ListTasks | 查询任务定义列表 | `tasks.index` |
| Users | GetUser | 获取用户详情 | `users.index` |
| Users | ListIdentityVerifications | 查询实名认证记录 | `identity-verifications.index` |
| Users | ListInviteRecords | 查询用户邀请关系记录 | `invite-records.index` |
| Users | ListUsers | 查询用户列表 | `users.index` |
| Users | AdjustUserBalance | 调整用户积分/金币余额（需审批） | `users.edit` |
| Users | ExtendUserVip | 延长用户VIP（需审批） | `users.edit` |
| Users | GetUserSocials | 获取用户第三方绑定 | `users.index` |
| Users | ResetUserContact | 重置用户联系方式（需审批） | `users.edit` |
| Users | ResetUserPassword | 重置用户密码（需审批） | `users.edit` |
| Users | ReviewIdentityVerification | 审核实名认证（需审批） | `identity-verifications.edit` |
| Users | SendUserNotification | 向用户发送站内通知（需审批） | `users.edit` |
| Users | SetUserStatus | 设置用户状态（需审批） | `users.edit` |
| Wallet | ListRecharges | 查询充值订单 | `wallet.orders` |
| Wallet | ListWalletTrades | 查询钱包流水 | `wallet.index` |
| Wallet | ListWithdraws | 查询提现申请 | `wallet.withdraws` |
| Wallet | ReviewWithdraw | 审核提现申请（需审批） | `wallet.withdraws` |
| Web | WebFetch | 网页抓取 | `chat.use` |

## SSE 事件类型

聊天接口通过 `text/event-stream` 逐行推送以下事件类型：

| 事件类型 | 说明 |
|---------|------|
| `text` | 文本增量输出 |
| `reasoning` | 思考过程展示 |
| `tool_call` | 工具调用信息 |
| `tool_approval_required` | 需要人工审批的敏感操作 |
| `error` | 错误信息 |
| `done` | 流结束标记 |

## 聊天请求流转

```
POST /admin/chat → ChatController → AI Agent (laravel/ai) → Tool 调用 → SSE Stream 响应
                                            ↓ (敏感操作)
                                       审批等待 → POST /admin/chat/approve → 继续执行
```

---

> 文档来源：PRD 第 3.4 节
