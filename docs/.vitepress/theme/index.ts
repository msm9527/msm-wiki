import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

import './style/vars.css'
import './style/custom.css'

export default {
  extends: DefaultTheme
} satisfies Theme
