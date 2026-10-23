# Ai Forge 文档站点

Ai Forge 企业级项目套件的官方文档，基于 [VitePress](https://vitepress.dev/) 构建。

## 线上访问

部署在 Vercel，访问地址：

```
https://www.aiforge.cn/
```

## 本地开发

```bash
# 安装依赖（pnpm >= 8.8）
pnpm install

# 启动开发服务（默认 http://localhost:5173/）
pnpm dev

# 构建静态站点（输出到 docs/.vitepress/dist）
pnpm build

# 预览构建产物
pnpm preview
```

## 部署

通过 Vercel 自动部署。Vercel 会识别 VitePress 项目并按以下配置构建：

- 构建命令：`pnpm build`
- 输出目录：`.vitepress/dist`（VitePress 默认值，相对于 doc 项目根）
- 根目录：`./`

环境变量无需配置，生产环境绑定自定义域名 `https://www.aiforge.cn/`。

## 目录结构

```
doc/
├── .vitepress/
│   ├── config.mts       # 站点配置（导航、侧边栏、head 等）
│   └── theme/           # 自定义主题
├── docs/
│   ├── index.md         # 首页
│   ├── overview/        # 项目概述
│   ├── features/        # 功能需求
│   ├── architecture/    # 技术架构
│   ├── database/        # 数据模型
│   ├── api/             # API 接口
│   ├── technical-solutions/  # 技术方案
│   ├── operations/      # 运维与开发
│   ├── roadmap/         # 路线图与附录
│   └── public/          # 静态资源（logo 等）
└── package.json
```

## 文档添加流程

1. 在对应分类目录下新建 `.md` 文件
2. 在 `.vitepress/config.mts` 的 `themeConfig.sidebar` 中注册新条目
3. 如需在顶部导航显示，在 `themeConfig.nav` 中添加对应入口