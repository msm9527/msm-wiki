import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import MsmConstellation from './components/MsmConstellation.vue'
import MsmDocEyebrow from './components/MsmDocEyebrow.vue'
import MsmImageLightbox from './components/MsmImageLightbox.vue'

// 自定义样式：按层次单向依赖，令牌 → 基础 → 布局 / 正文 / 首页。
// 每个组件只由一个文件负责，不再互相覆盖。
import './style/tokens.css'
import './style/base.css'
import './style/layout.css'
import './style/content.css'
import './style/home.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // 首页 Hero 视觉：用网络星座替换默认的 logo 图版
      'home-hero-image': () => h(MsmConstellation),
      // 文档页眉标：使用原生 doc-before 插槽，避免路由切换后的 DOM 注入抖动
      'doc-before': () => h(MsmDocEyebrow),
      // 教程截图点击放大灯箱
      'layout-bottom': () => h(MsmImageLightbox)
    })
  },
  enhanceApp({ router }) {
    if (typeof window === 'undefined') return

    // 标记 JS 已就绪：滚动入场的初始隐藏态只在有此类时生效，
    // 脚本失效时内容照常可见（渐进增强）。
    document.documentElement.classList.add('msm-js')

    let revealObserver: IntersectionObserver | null = null

    // 去掉代码块复制按钮的浏览器原生 tooltip，同时保留无障碍标签
    const cleanupCopyTitle = () => {
      const buttons = document.querySelectorAll<HTMLButtonElement>(
        '.vp-doc div[class*="language-"] button.copy'
      )
      buttons.forEach((btn) => {
        if (!btn.getAttribute('aria-label')) {
          btn.setAttribute('aria-label', '复制代码')
        }
        if (btn.title) {
          btn.removeAttribute('title')
        }
      })
    }

    // 自定义移动端抽屉导航：基于汉堡按钮，独立创建抽屉内容（含主题切换与社区链接）
    const setupMobileDrawer = () => {
      const hamburger = document.querySelector<HTMLButtonElement>(
        '.VPNavBarHamburger'
      )
      const topNav = document.querySelector<HTMLElement>('.VPNavBarMenu')

      const overlayId = 'msm-nav-overlay'
      const drawerId = 'msm-nav-drawer'
      const drawerBreakpoint = 959

      // 规范化路径：去掉 index.html、.html 和多余的末尾 /
      const normalizePath = (path: string) => {
        if (!path) return '/'
        let p = path
        if (p.endsWith('index.html')) {
          p = p.slice(0, -'index.html'.length)
        } else if (p.endsWith('.html')) {
          p = p.slice(0, -'.html'.length)
        }
        if (p.length > 1 && p.endsWith('/')) {
          p = p.slice(0, -1)
        }
        return p || '/'
      }

      const cleanup = () => {
        const overlay = document.getElementById(overlayId)
        const drawer = document.getElementById(drawerId)
        if (overlay) overlay.remove()
        if (drawer) drawer.remove()
        document.body.classList.remove('msm-nav-open')
      }

      if (!hamburger || !topNav) {
        cleanup()
        return
      }

      if ((hamburger as any)._msmDrawerBound) {
        cleanup()
        return
      }

      const closeDrawer = () => {
        const overlay = document.getElementById(overlayId)
        const drawer = document.getElementById(drawerId)
        if (overlay) overlay.classList.remove('msm-open')
        if (drawer) {
          drawer.classList.remove('msm-open')
          drawer.setAttribute('aria-hidden', 'true')
        }
        document.body.classList.remove('msm-nav-open')
      }

      const requestClose = (restoreFocus = true) => {
        if (hamburger.getAttribute('aria-expanded') === 'true') {
          hamburger.click()
        } else {
          closeDrawer()
        }

        if (restoreFocus) {
          requestAnimationFrame(() => hamburger.focus())
        }
      }

      const buildDrawer = () => {
        cleanup()

        const currentPath = normalizePath(window.location.pathname)

        const overlay = document.createElement('div')
        overlay.id = overlayId
        overlay.setAttribute('aria-hidden', 'true')

        const drawer = document.createElement('nav')
        drawer.id = drawerId
        drawer.setAttribute('role', 'dialog')
        drawer.setAttribute('aria-modal', 'true')
        drawer.setAttribute('aria-label', '移动端主导航')
        drawer.setAttribute('aria-hidden', 'true')

        const header = document.createElement('div')
        header.className = 'msm-nav-header'

        const title = document.createElement('strong')
        title.textContent = '导航'

        const closeButton = document.createElement('button')
        closeButton.type = 'button'
        closeButton.className = 'msm-nav-close'
        closeButton.textContent = '关闭'
        closeButton.addEventListener('click', () => requestClose())

        header.append(title, closeButton)
        drawer.appendChild(header)

        const primaryLinks = document.createElement('div')
        primaryLinks.className = 'msm-nav-primary'
        drawer.appendChild(primaryLinks)

        let hasActive = false
        let firstLink: HTMLAnchorElement | null = null

        const createLink = (a: HTMLAnchorElement) => {
          const clone = document.createElement('a')
          clone.href = a.href
          clone.textContent = a.textContent?.trim() || ''
          clone.className = 'msm-nav-link'
          if (a.target) clone.target = a.target
          if (a.rel) clone.rel = a.rel

          try {
            const url = new URL(a.href, window.location.origin)
            const linkPath = normalizePath(url.pathname)
            if (linkPath === currentPath) {
              clone.classList.add('active')
              hasActive = true
            }
          } catch {
            // URL 解析异常时，稍后使用兜底逻辑
          }

          clone.addEventListener('click', () => {
            requestClose(false)
          })
          firstLink ??= clone
          return clone
        }

        Array.from(topNav.children).forEach((item) => {
          if (item instanceof HTMLAnchorElement) {
            primaryLinks.appendChild(createLink(item))
            return
          }

          const links = item.querySelectorAll<HTMLAnchorElement>('a')
          if (!links.length) return

          const label = item
            .querySelector<HTMLElement>(':scope > button')
            ?.textContent?.trim()
          if (!label) return

          const group = document.createElement('section')
          group.className = 'msm-nav-group'

          const groupTitle = document.createElement('div')
          groupTitle.className = 'msm-nav-group-title'
          groupTitle.textContent = label

          const groupLinks = document.createElement('div')
          groupLinks.className = 'msm-nav-group-links'
          links.forEach((link) => groupLinks.appendChild(createLink(link)))

          group.append(groupTitle, groupLinks)
          drawer.appendChild(group)
        })

        if (!hasActive && firstLink) {
          firstLink.classList.add('active')
        }

        if (!primaryLinks.childElementCount) {
          primaryLinks.remove()
        }

        // 抽屉底部操作栏：保留明暗主题切换与社区入口（解决 <768px 原生工具区被隐藏的问题）
        const footer = document.createElement('div')
        footer.className = 'msm-nav-footer'

        const themeButton = document.createElement('button')
        themeButton.type = 'button'
        themeButton.className = 'msm-nav-theme-btn'
        const syncThemeLabel = () => {
          const isDark = document.documentElement.classList.contains('dark')
          themeButton.textContent = isDark ? '切换为浅色模式' : '切换为深色模式'
          themeButton.setAttribute('aria-pressed', String(isDark))
        }
        syncThemeLabel()
        themeButton.addEventListener('click', () => {
          const nativeSwitch = document.querySelector<HTMLButtonElement>(
            '.VPSwitchAppearance'
          )
          if (nativeSwitch) {
            nativeSwitch.click()
          } else {
            document.documentElement.classList.toggle('dark')
          }
          requestAnimationFrame(syncThemeLabel)
        })
        footer.appendChild(themeButton)

        const socialAnchors = document.querySelectorAll<HTMLAnchorElement>(
          '.VPNavBarSocialLinks a'
        )
        if (socialAnchors.length) {
          const socials = document.createElement('div')
          socials.className = 'msm-nav-socials'
          socialAnchors.forEach((anchor) => {
            const link = document.createElement('a')
            link.href = anchor.href
            link.target = anchor.target || '_blank'
            link.rel = anchor.rel || 'noreferrer'
            link.className = 'msm-nav-social-link'
            link.textContent =
              anchor.getAttribute('aria-label') ||
              (anchor.href.includes('github.com') ? 'GitHub' : '社区链接')
            link.addEventListener('click', () => requestClose(false))
            socials.appendChild(link)
          })
          footer.appendChild(socials)
        }

        drawer.appendChild(footer)

        document.body.appendChild(overlay)
        document.body.appendChild(drawer)

        overlay.addEventListener('click', () => requestClose())
        drawer.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            requestClose()
            return
          }
          if (event.key === 'Tab') {
            const focusables = drawer.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled])'
            )
            if (!focusables.length) return
            const first = focusables[0]
            const last = focusables[focusables.length - 1]
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault()
              last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault()
              first.focus()
            }
          }
        })
      }

      const openDrawer = () => {
        const isMobile = window.innerWidth <= drawerBreakpoint
        if (!isMobile) return

        buildDrawer()

        const overlay = document.getElementById(overlayId)
        const drawer = document.getElementById(drawerId)
        if (!overlay || !drawer) return

        overlay.classList.add('msm-open')
        drawer.classList.add('msm-open')
        drawer.setAttribute('aria-hidden', 'false')
        document.body.classList.add('msm-nav-open')
        requestAnimationFrame(() => {
          drawer
            .querySelector<HTMLButtonElement>('.msm-nav-close')
            ?.focus()
        })
      }

      const toggleFromAria = () => {
        const isOpen = hamburger.getAttribute('aria-expanded') === 'true'
        if (isOpen) {
          openDrawer()
        } else {
          closeDrawer()
        }
      }

      toggleFromAria()

      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'attributes' && m.attributeName === 'aria-expanded') {
            toggleFromAria()
            break
          }
        }
      })
      observer.observe(hamburger, { attributes: true })

      ;(hamburger as any)._msmDrawerBound = true

      window.addEventListener('resize', () => {
        const isMobile = window.innerWidth <= drawerBreakpoint
        if (!isMobile) {
          requestClose(false)
        }
      })
    }

    // 滚动入场：卡片 / 快速导航 / 正文小节进入视口时加 .msm-reveal 触发过渡。
    // 路由切换时先释放旧观察器；带 hash 锚点跳转或不支持 IO 时直接放行。
    const setupScrollReveal = () => {
      if (revealObserver) {
        revealObserver.disconnect()
        revealObserver = null
      }

      const targets = document.querySelectorAll<HTMLElement>(
        '.VPHome .VPFeatures .item, .msm-home-jump a, .VPHome .vp-doc h2, .VPHome .vp-doc .msm-goal, .VPHome .vp-doc .msm-router, .VPHome .vp-doc .msm-link'
      )
      if (!targets.length) return

      if (!('IntersectionObserver' in window) || window.location.hash) {
        targets.forEach((el) => el.classList.add('msm-reveal'))
        return
      }

      revealObserver = new IntersectionObserver(
        (entries, obs) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('msm-reveal')
              obs.unobserve(entry.target)
            }
          }
        },
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
      )

      targets.forEach((el) => {
        if (el.classList.contains('msm-reveal')) return
        const rect = el.getBoundingClientRect()
        if (rect.top < window.innerHeight * 0.95) {
          el.classList.add('msm-reveal')
          return
        }
        revealObserver!.observe(el)
      })
    }

    const setupScrollProgress = () => {
      const barId = 'msm-scroll-progress'

      const computeRatio = () => {
        const doc = document.documentElement
        const max = doc.scrollHeight - doc.clientHeight
        return max > 0 ? Math.min(1, doc.scrollTop / max) : 0
      }

      const existing = document.getElementById(barId)
      if (existing) {
        requestAnimationFrame(() => {
          existing.style.setProperty('--msm-scroll', String(computeRatio()))
        })
        return
      }

      const bar = document.createElement('div')
      bar.id = barId
      bar.setAttribute('aria-hidden', 'true')
      document.body.appendChild(bar)

      let ticking = false
      const update = () => {
        bar.style.setProperty('--msm-scroll', String(computeRatio()))
        ticking = false
      }

      window.addEventListener(
        'scroll',
        () => {
          if (!ticking) {
            ticking = true
            requestAnimationFrame(update)
          }
        },
        { passive: true }
      )
      update()
    }

    const initDomTweaks = () => {
      cleanupCopyTitle()
      setupMobileDrawer()
      setupScrollReveal()
      setupScrollProgress()
    }

    if (document.readyState === 'loading') {
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          initDomTweaks()
        },
        { once: true }
      )
    } else {
      initDomTweaks()
    }

    ;(router as any).onAfterRouteChanged = () => {
      requestAnimationFrame(() => initDomTweaks())
    }
  }
} satisfies Theme
