import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: 'docs',
  lang: 'zh-CN',
  title: 'Ai Forge',
  titleTemplate: ':title | Ai Forge 企业级项目套件',
  description:
    'Ai Forge 企业级项目套件：基于 Laravel 13.x + DDD 架构的开箱即用后台管理解决方案，内置双端认证、RBAC 权限、钱包、任务、用户分群，集成 AI 助手、知识库 RAG 与多模态生成，配套 Vue 3 管理后台与完整技术文档。',
  lastUpdated: true,
  cleanUrls: true,
  sitemap: {
    hostname: 'https://www.aiforge.cn'
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    [
      'meta',
      {
        name: 'keywords',
        content:
          'Ai Forge,企业级项目套件,Laravel 骨架,Laravel 后台管理,Laravel API 骨架,DDD 架构,RBAC 权限管理,AI 助手,知识库 RAG,多模态生成,Vue 3 管理后台,RESTful API,Laravel 13'
      }
    ],
    ['meta', { name: 'robots', content: 'index,follow' }],
    ['link', { rel: 'canonical', href: 'https://www.aiforge.cn/' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'zh_CN' }],
    ['meta', { property: 'og:title', content: 'Ai Forge 企业级项目套件' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          '基于 Laravel 13.x + DDD 架构的开箱即用后台管理解决方案：双端认证、RBAC 权限、钱包/任务/分群业务模块，集成 AI 助手、知识库 RAG 与多模态生成，配套 Vue 3 管理后台。'
      }
    ],
    ['meta', { property: 'og:url', content: 'https://www.aiforge.cn/' }],
    ['meta', { property: 'og:site_name', content: 'Ai Forge' }],
    ['meta', { property: 'og:image', content: 'https://www.aiforge.cn/logo.svg' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:title', content: 'Ai Forge 企业级项目套件' }],
    [
      'meta',
      {
        name: 'twitter:description',
        content:
          '基于 Laravel 13.x + DDD 架构的开箱即用后台管理解决方案：双端认证、RBAC 权限、AI 助手、知识库 RAG 与多模态生成。'
      }
    ],
    ['meta', { name: 'twitter:url', content: 'https://www.aiforge.cn/' }],
    // 百度统计
    [
      'script',
      {},
      `var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?3422cff905b3d10cf2c3339337de7803";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();`
    ]
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.svg',

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档'
          },
          modal: {
            noResultsText: '无法找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭'
            }
          }
        }
      }
    },

    nav: [
      { text: '首页', link: '/' },
      { text: '项目概述', link: '/overview/project-overview' },
      { text: '功能需求', link: '/features/user-system' },
      { text: '技术架构', link: '/architecture/tech-stack' },
      { text: 'API 接口', link: '/api/response-format' },
      { text: '技术方案', link: '/technical-solutions/attachment-management' },
      { text: '运维与开发', link: '/operations/development-guide' },
      { text: '路线图', link: '/roadmap/roadmap' },
      { text: '商业授权', link: '/commercial-license' }
    ],

    sidebar: [
      {
        text: '项目概述',
        items: [{ text: '项目概述与产品定位', link: '/overview/project-overview' }]
      },
      {
        text: '功能需求',
        items: [
          { text: '用户系统', link: '/features/user-system' },
          { text: '认证与授权', link: '/features/auth-and-permission' },
          { text: '后台管理系统', link: '/features/admin-system' },
          { text: 'AI 助手', link: '/features/ai-assistant' },
          { text: '核心服务', link: '/features/core-services' }
        ]
      },
      {
        text: '技术架构',
        items: [
          { text: '技术栈', link: '/architecture/tech-stack' },
          { text: '项目结构', link: '/architecture/project-structure' },
          { text: '架构设计', link: '/architecture/architecture-design' }
        ]
      },
      {
        text: '数据模型',
        items: [
          { text: '核心数据表', link: '/database/core-tables' },
          { text: '业务数据表', link: '/database/business-tables' }
        ]
      },
      {
        text: 'API 接口',
        items: [
          { text: '响应格式与状态码', link: '/api/response-format' },
          { text: '后台管理接口', link: '/api/admin-api' },
          { text: '前台 API v1 接口', link: '/api/api-v1' }
        ]
      },
      {
        text: '技术方案',
        items: [
          { text: '附件管理', link: '/technical-solutions/attachment-management' },
          { text: '实名认证', link: '/technical-solutions/identity-verification' },
          { text: '邀请', link: '/technical-solutions/invitation' },
          { text: '访问记录', link: '/technical-solutions/visit-tracking' },
          { text: '用户任务', link: '/technical-solutions/user-tasks' },
          { text: '钱包', link: '/technical-solutions/wallet' },
          { text: '举报管理', link: '/technical-solutions/report-management' }
        ]
      },
      {
        text: '运维与开发',
        items: [
          { text: '非功能性需求', link: '/operations/non-functional-requirements' },
          { text: '开发流程指南', link: '/operations/development-guide' },
          { text: '部署方案', link: '/operations/deployment' },
          { text: '监控与维护', link: '/operations/monitoring' },
          { text: '定时任务', link: '/operations/scheduled-tasks' }
        ]
      },
      {
        text: '路线图与附录',
        items: [
          { text: 'Roadmap 路线图', link: '/roadmap/roadmap' },
          { text: '附录', link: '/roadmap/appendix' }
        ]
      },
      {
        text: '商业授权',
        items: [{ text: '商业授权', link: '/commercial-license' }]
      }
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/larva-cool/laravel-skel-forge' }],

    outline: {
      level: [2, 3],
      label: '本页目录'
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    darkModeSwitchLabel: '外观',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部',
    langMenuLabel: '语言',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',

    lastUpdated: {
      text: '最后更新于'
    },

    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2026 Ai Forge'
    }
  }
})
