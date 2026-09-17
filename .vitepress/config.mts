import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: 'docs',
  lang: 'zh-CN',
  title: 'Laravel Skel Forge',
  description: 'Laravel 13.x 企业级 API 骨架项目文档',
  lastUpdated: true,
  cleanUrls: true,

  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]],

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
      { text: '路线图', link: '/roadmap/roadmap' }
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
          { text: '用户任务', link: '/technical-solutions/user-tasks' },
          { text: '钱包', link: '/technical-solutions/wallet' }
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
      }
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/' }],

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
      copyright: 'Copyright © 2026'
    }
  }
})
