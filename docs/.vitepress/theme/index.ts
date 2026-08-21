import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import MsmConstellation from './components/MsmConstellation.vue'

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
      'home-hero-image': () => h(MsmConstellation)
    })
  },
  enhanceApp({ router }) {
    if (typeof window === 'undefined') return

    // 标记 JS 已就绪：滚动入场的初始隐藏态只在有此类时生效，
    // 脚本失效时内容照常可见（渐进增强）。
    document.documentElement.classList.add('msm-js')

    // 去掉代码块复制按钮的浏览器原生 tooltip
    const cleanupCopyTitle = () => {
      const buttons = document.querySelectorAll<HTMLButtonElement>(
        '.vp-doc div[class*="language-"] button.copy'
      )
      buttons.forEach((btn) => {
        if (btn.title) {
          btn.removeAttribute('title')
        }
      })
    }

    // 自定义移动端抽屉导航：基于汉堡按钮，独立创建抽屉内容
    const setupMobileDrawer = () => {
      const hamburger = document.querySelector<HTMLButtonElement>(
        '.VPNavBarHamburger'
      )
      const topNav = document.querySelector<HTMLElement>('.VPNavBarMenu')

      const overlayId = 'msm-nav-overlay'
      const drawerId = 'msm-nav-drawer'
      const drawerBreakpoint = 1199

      // 规范化路径：去掉 index.html 和多余的末尾 /
      const normalizePath = (path: string) => {
        if (!path) return '/'
        let p = path
        if (p.endsWith('index.html')) {
          p = p.slice(0, -'index.html'.length)
        }
        if (p.length > 1 && p.endsWith('/')) {
          p = p.slice(0, -1)
        }
        return p || '/'
      }

      // 清理旧的抽屉和遮罩
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

      // 防止重复绑定
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

          // 通过当前路径匹配高亮项
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
            // 点击后关闭抽屉，让路由接管导航
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

        // 如果没有匹配到任何 active，兜底把第一个链接高亮
        if (!hasActive && firstLink) {
          firstLink.classList.add('active')
        }

        if (!primaryLinks.childElementCount) {
          primaryLinks.remove()
        }

        document.body.appendChild(overlay)
        document.body.appendChild(drawer)

        overlay.addEventListener('click', () => requestClose())
        drawer.addEventListener('keydown', (event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            requestClose()
          }
        })
      }

      const openDrawer = () => {
        const isMobile = window.innerWidth <= drawerBreakpoint
        if (!isMobile) return

        if (!document.getElementById(drawerId)) {
          buildDrawer()
        }

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

      // 初始状态同步一次
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

      // 记录绑定状态，避免重复初始化
      ;(hamburger as any)._msmDrawerBound = true

      // 窗口尺寸变化时重建（从桌面切到移动）
      window.addEventListener('resize', () => {
        const isMobile = window.innerWidth <= drawerBreakpoint
        if (!isMobile) {
          requestClose(false)
        }
      })
    }

    // 滚动入场：卡片 / 快速导航 / 正文小节进入视口时加 .msm-reveal 触发过渡。
    // 观察一次即取消观察，避免重复触发；不支持 IO 的老浏览器直接放行。
    const setupScrollReveal = () => {
      const targets = document.querySelectorAll<HTMLElement>(
        '.VPHome .VPFeatures .item, .msm-home-jump a, .VPHome .vp-doc h2'
      )

      if (!('IntersectionObserver' in window)) {
        targets.forEach((el) => el.classList.add('msm-reveal'))
        return
      }

      const observer = new IntersectionObserver(
        (entries, obs) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('msm-reveal')
              obs.unobserve(entry.target)
            }
          }
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
      )

      targets.forEach((el) => {
        if (el.classList.contains('msm-reveal')) return
        observer.observe(el)
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
        // 路由切换后页面高度变化、且已滚回顶部，重算一次
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
      setupDocEyebrow()
    }

    // 文档页在 h1 上方注入一条等宽小眉标，显示当前所属的侧栏分组
    // （如"快速上手"），把文档页和首页的标注语汇统一起来。
    // 分组名取自侧栏里高亮的 level-0 分组；取不到就不注入。
    function setupDocEyebrow() {
      const h1 = document.querySelector<HTMLElement>('.VPDoc .vp-doc h1')
      if (!h1) return

      // 路由切换后重建，先移除旧的
      document.querySelector('.msm-doc-eyebrow')?.remove()

      const groupLabel = document
        .querySelector<HTMLElement>(
          '.VPSidebar .VPSidebarItem.level-0.has-active > .item .text'
        )
        ?.textContent?.trim()

      if (!groupLabel) return

      const eyebrow = document.createElement('div')
      eyebrow.className = 'msm-doc-eyebrow'
      eyebrow.textContent = groupLabel
      h1.parentElement?.insertBefore(eyebrow, h1)
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
