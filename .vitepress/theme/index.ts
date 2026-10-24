import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './custom.css'

declare global {
  interface Window {
    _hmt?: Array<[string, ...unknown[]]>
  }
}

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ router }) {
    // 百度统计：SPA 路由切换时手动上报 PV
    if (typeof window === 'undefined') {
      return
    }
    router.onAfterRouteChange = (to: string) => {
      window._hmt?.push(['_trackPageview', to])
    }
  }
}

export default theme
