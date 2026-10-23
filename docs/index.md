---
# https://vitepress.dev/reference/default-theme-home-page
layout: home
title: Ai Forge 企业级项目套件 - Laravel 13 + DDD 架构后台管理骨架
titleTemplate: false

hero:
  name: "Ai Forge"
  text: "企业级项目套件"
  tagline: 基于 Laravel 13.x + DDD 架构，内置双端认证、RBAC 权限、钱包/任务/分群等完整业务模块，以及 AI 助手、知识库 RAG 与多模态生成的一站式 AI 能力
  image:
    src: /logo.svg
    alt: Ai Forge
  actions:
    - theme: brand
      text: 快速开始
      link: /operations/development-guide
    - theme: alt
      text: 功能特性
      link: /features/admin-system
    - theme: alt
      text: 演示后台
      link: https://admin-demo.aiforge.cn

features:
  - icon: 🚀
    title: 快速启动
    details: 一键安装和配置，开箱即用的企业级 API 开发模板，配套独立前端 SPA 管理后台。
  - icon: 🛡️
    title: 安全可靠
    details: Sanctum 双 Guard 隔离的管理员/用户认证体系，RBAC 角色权限精确到按钮级权限点。
  - icon: 🧩
    title: 架构清晰
    details: DDD 分层架构，模块化设计，代码组织规范、易于扩展。
  - icon: 🤖
    title: AI 助手
    details: SSE 流式对话 + 50+ 内置业务工具，敏感操作人工审批，三层权限防线防越权调用。
  - icon: 📚
    title: 知识库 RAG
    details: 文档分块 + Embedding 向量索引，语义检索问答；公众号智能客服基于知识库自动回复。
  - icon: 🎨
    title: 多模态生成
    details: 火山方舟一站接入：文本对话、向量、TTS 语音、Seedream 图像、Seedance 视频生成。
  - icon: 💰
    title: 用户钱包
    details: 余额/冻结余额账本，充值/提现/流水全链路，审核打款、超时关单，支持 Excel 导出。
  - icon: 👥
    title: 用户运营
    details: 用户分群（手动 + 规则）、任务中心、邀请关系与统计、PV/UV 访问记录，助力精细化运营。
  - icon: ✅
    title: 内容审核
    details: 评论/举报/反馈/实名认证全流程审核，AI 辅助初判与隐藏/删除/冻结联动处置。
  - icon: 📊
    title: 运维完善
    details: Pulse / Horizon / Telescope 监控体系，调度日志、操作审计与登录历史全记录。
  - icon: ⚡
    title: 实时通信
    details: Laravel Reverb + Echo 提供 WebSocket 能力，支持私有频道与前端事件订阅。
  - icon: 📦
    title: 双端交付
    details: 管理后台 + 前台 API v1 双套 RESTful 接口，多态点赞/收藏/关注/评论互动体系。
---
