<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'

type SidebarItem = {
  text?: string
  link?: string
  items?: SidebarItem[]
}

const { theme, frontmatter } = useData()
const route = useRoute()

function normalizePath(path: string): string {
  let p = path.split('#')[0].split('?')[0]
  if (p.endsWith('index.html')) p = p.slice(0, -'index.html'.length)
  else if (p.endsWith('.html')) p = p.slice(0, -'.html'.length)
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1)
  return p || '/'
}

function containsLink(items: SidebarItem[] | undefined, current: string): boolean {
  if (!items) return false
  return items.some((item) => {
    if (item.link && normalizePath(item.link) === current) return true
    return containsLink(item.items, current)
  })
}

const groupLabel = computed(() => {
  if (
    frontmatter.value.layout === 'home' ||
    frontmatter.value.pageClass === 'msm-release-page'
  ) {
    return ''
  }

  const sidebar = theme.value.sidebar
  const groups: SidebarItem[] = Array.isArray(sidebar)
    ? sidebar
    : sidebar && typeof sidebar === 'object'
      ? (sidebar['/zh/'] ?? Object.values(sidebar)[0] ?? [])
      : []

  const current = normalizePath(route.path)
  const matched = groups.find((group) => containsLink(group.items, current))
  return matched?.text ?? ''
})
</script>

<template>
  <div v-if="groupLabel" class="msm-doc-eyebrow" aria-hidden="true">
    {{ groupLabel }}
  </div>
</template>
