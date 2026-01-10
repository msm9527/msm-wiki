import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

// 导入自定义样式
import './style/vars.css'
import './style/custom.css'
import './style/advanced.css'
import './style/icons.css'
import './style/svg-icons.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // 可以在这里插入自定义组件
    })
  },
  enhanceApp({ router }) {
    if (typeof window === 'undefined') return

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
      }

      if (!hamburger || !topNav) {
        cleanup()
        return
      }

      // 防止重复绑定
      ;(hamburger as any)._msmDrawerBound && cleanup()

      const buildDrawer = () => {
        cleanup()

        const currentPath = normalizePath(window.location.pathname)

        const overlay = document.createElement('div')
        overlay.id = overlayId

        const drawer = document.createElement('div')
        drawer.id = drawerId

        // 从顶部导航复制所有 a 链接到抽屉里
        const links = topNav.querySelectorAll<HTMLAnchorElement>('a')
        const clones: HTMLAnchorElement[] = []
        let hasActive = false

        links.forEach((a) => {
          const clone = document.createElement('a')
          clone.href = a.href
          clone.textContent = a.textContent || ''
          clone.className = 'msm-nav-link'

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
            closeDrawer()
          })
          clones.push(clone)
        })

        // 如果没有匹配到任何 active，兜底把第一个链接高亮
        if (!hasActive && clones.length > 0) {
          clones[0].classList.add('active')
        }

        clones.forEach((clone) => drawer.appendChild(clone))

        document.body.appendChild(overlay)
        document.body.appendChild(drawer)

        overlay.addEventListener('click', () => {
          closeDrawer()
        })
      }

      const openDrawer = () => {
        const isMobile = window.innerWidth <= 768
        if (!isMobile) return

        if (!document.getElementById(drawerId)) {
          buildDrawer()
        }

        const overlay = document.getElementById(overlayId)
        const drawer = document.getElementById(drawerId)
        if (!overlay || !drawer) return

        overlay.classList.add('msm-open')
        drawer.classList.add('msm-open')
      }

      const closeDrawer = () => {
        const overlay = document.getElementById(overlayId)
        const drawer = document.getElementById(drawerId)
        if (overlay) overlay.classList.remove('msm-open')
        if (drawer) drawer.classList.remove('msm-open')
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
        const isMobile = window.innerWidth <= 768
        if (!isMobile) {
          closeDrawer()
        }
      })
    }

    const initDomTweaks = () => {
      cleanupCopyTitle()
      setupMobileDrawer()
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
