import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "MSM Wiki",
  description: "Mosdns Singbox Mihomo Manager - 统一管理平台文档",
  base: '/msm-wiki/',
  ignoreDeadLinks: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/msm-wiki/logo/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#2563eb' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'zh_CN' }],
    ['meta', { name: 'og:site_name', content: 'MSM Wiki' }],
  ],

  themeConfig: {
    logo: '/logo/logo-square.svg',
    siteTitle: 'MSM Wiki',

    nav: [
      { text: '首页', link: '/zh/' },
      { text: '快速开始', link: '/zh/guide/getting-started' },
      { text: '用户指南', link: '/zh/guide/' },
      { text: '部署指南', link: '/zh/deployment/' },
      {
        text: '语言',
        items: [
          { text: '简体中文', link: '/zh/' },
          { text: 'English', link: '/en/' }
        ]
      }
    ],

    sidebar: {
      '/zh/': [
        {
          text: '介绍',
          items: [
            { text: '什么是 MSM', link: '/zh/introduction/what-is-msm' },
            { text: '核心特性', link: '/zh/introduction/features' },
            { text: '透明代理架构', link: '/zh/introduction/transparent-proxy' }
          ]
        },
        {
          text: '快速开始',
          items: [
            { text: '一键安装部署', link: '/zh/guide/install' },
            { text: '手动安装', link: '/zh/guide/getting-started' },
            { text: '基础配置', link: '/zh/guide/basic-config' },
            { text: '首次使用', link: '/zh/guide/first-use' }
          ]
        },
        {
          text: '用户指南',
          items: [
            { text: '用户管理', link: '/zh/guide/user-management' },
            { text: 'MosDNS 管理', link: '/zh/guide/mosdns' },
            { text: 'SingBox 管理', link: '/zh/guide/singbox' },
            { text: 'Mihomo 管理', link: '/zh/guide/mihomo' },
            { text: '配置编辑', link: '/zh/guide/config-editor' },
            { text: '历史记录与回滚', link: '/zh/guide/history' },
            { text: '日志查看', link: '/zh/guide/logs' }
          ]
        },
        {
          text: 'API 文档',
          items: [
            { text: 'API 概览', link: '/zh/api/' },
            { text: '认证与会话', link: '/zh/api/auth' },
            { text: '初始化与安装', link: '/zh/api/setup' },
            { text: '服务管理', link: '/zh/api/services' },
            { text: '配置管理', link: '/zh/api/config' },
            { text: '历史记录', link: '/zh/api/history' },
            { text: '日志管理', link: '/zh/api/logs' },
            { text: '系统监控', link: '/zh/api/monitor' },
            { text: '用户管理', link: '/zh/api/users' },
            { text: '个人资料', link: '/zh/api/profile' },
            { text: '系统设置', link: '/zh/api/settings' },
            { text: '系统诊断', link: '/zh/api/system' },
            { text: '更新管理', link: '/zh/api/update' },
            { text: 'MosDNS 管理', link: '/zh/api/mosdns' },
            { text: 'Sing-box 管理', link: '/zh/api/singbox' },
            { text: 'Mihomo 管理', link: '/zh/api/mihomo' },
            { text: '事件流（SSE）', link: '/zh/api/events' }
          ]
        },
        {
          text: '部署指南',
          items: [
            { text: '单机部署', link: '/zh/deployment/standalone' },
            { text: 'Nginx 配置', link: '/zh/deployment/nginx' },
            { text: 'HTTPS 配置', link: '/zh/deployment/https' }
          ]
        },
        {
          text: '常见问题',
          items: [
            { text: 'FAQ', link: '/zh/faq/' },
            { text: '故障排查', link: '/zh/faq/troubleshooting' }
          ]
        }
      ],
      '/en/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is MSM', link: '/en/introduction/what-is-msm' },
            { text: 'Features', link: '/en/introduction/features' }
          ]
        },
        {
          text: 'Getting Started',
          items: [
            { text: 'Installation', link: '/en/guide/getting-started' },
            { text: 'Basic Configuration', link: '/en/guide/basic-config' },
            { text: 'First Use', link: '/en/guide/first-use' }
          ]
        },
        {
          text: 'User Guide',
          items: [
            { text: 'User Management', link: '/en/guide/user-management' },
            { text: 'MosDNS Management', link: '/en/guide/mosdns' },
            { text: 'SingBox Management', link: '/en/guide/singbox' },
            { text: 'Mihomo Management', link: '/en/guide/mihomo' },
            { text: 'Config Editor', link: '/en/guide/config-editor' },
            { text: 'History & Rollback', link: '/en/guide/history' },
            { text: 'Logs', link: '/en/guide/logs' }
          ]
        },
        {
          text: 'Deployment',
          items: [
            { text: 'Standalone', link: '/en/deployment/standalone' },
            { text: 'Nginx', link: '/en/deployment/nginx' },
            { text: 'HTTPS', link: '/en/deployment/https' }
          ]
        },
        {
          text: 'FAQ',
          items: [
            { text: 'FAQ', link: '/en/faq/' },
            { text: 'Troubleshooting', link: '/en/faq/troubleshooting' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/msm9527/msm-wiki' }
    ],

    footer: {
      message: 'MSM - 统一管理 MosDNS、SingBox、Mihomo 的平台',
      copyright: 'Copyright © 2024-present MSM Project'
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          zh: {
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
                  navigateText: '切换'
                }
              }
            }
          }
        }
      }
    },

    editLink: {
      pattern: 'https://github.com/msm9527/msm-wiki/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页'
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    outline: {
      label: '页面导航'
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式'
  },

  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/zh/'
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Getting Started', link: '/en/guide/getting-started' },
          { text: 'User Guide', link: '/en/guide/' },
          { text: 'Deployment', link: '/en/deployment/' }
        ],
        editLink: {
          pattern: 'https://github.com/msm9527/msm-wiki/edit/main/docs/:path',
          text: 'Edit this page on GitHub'
        },
        lastUpdated: {
          text: 'Last updated'
        },
        docFooter: {
          prev: 'Previous page',
          next: 'Next page'
        },
        outline: {
          label: 'On this page'
        },
        returnToTopLabel: 'Return to top',
        sidebarMenuLabel: 'Menu',
        darkModeSwitchLabel: 'Appearance'
      }
    }
  }
})
