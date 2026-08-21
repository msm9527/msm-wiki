<script setup lang="ts">
import { withBase } from 'vitepress'

/*
 * 网络星座 Hero 视觉
 *
 * MSM logo 是一张"节点图"，产品本身又是家庭网络的中枢 —— 于是把 Hero 做成
 * 一张活的网络：logo 居中当枢纽，六条彩色连线辐射到六个服务节点（对应六大功能），
 * 连线用流动的虚线表现"数据在链路上跑"。去掉了原来的灰色玻璃图版。
 *
 * 六个节点顺时针排布（正上方开始），坐标基于 400×400 视口、中心 (200,200)、
 * 节点半径 130。连线只画 logo 边缘 (R≈60) 到节点边缘 (R≈110) 的一段。
 */

type Node = {
  key: string
  label: string
  color: string
  link: string
  // 节点中心（百分比，用于 HTML 徽章定位）
  x: number
  y: number
  // 连线两端（SVG 坐标）
  line: [number, number, number, number]
  icon: string
  delay: string
}

const ICONS: Record<string, string> = {
  dns: '<path d="M3 3h18v6H3z" rx="2"/><circle cx="7" cy="6" r=".9" fill="currentColor" stroke="none"/><path d="M11 6h6M12 9v4M12 13l-5 4M12 13l5 4"/><circle cx="7" cy="19" r="2"/><circle cx="17" cy="19" r="2"/>',
  proxy: '<path d="M12 2 4 5v6c0 5.4 3.7 10.5 8 12 4.3-1.5 8-6.6 8-12V5l-8-3Z"/><path d="M7.5 12h9M13 8.5l3.5 3.5-3.5 3.5"/>',
  home: '<path d="m3 11 9-7 9 7M5 10v10h14V10"/><path d="M8 15h8M10 12.5 7.5 15 10 17.5M14 12.5l2.5 2.5-2.5 2.5"/>',
  domain: '<circle cx="10" cy="13" r="8"/><path d="M2 13h16M10 5c2.1 2.2 3.2 4.9 3.2 8S12.1 18.8 10 21c-2.1-2.2-3.2-4.9-3.2-8S7.9 7.2 10 5ZM16 3h5v5M21 3l-6 6"/>',
  docker: '<rect x="3" y="4" width="8" height="6" rx="1"/><rect x="13" y="4" width="8" height="6" rx="1"/><rect x="8" y="14" width="8" height="6" rx="1"/><path d="M7 10v2h10v-2M12 12v2M6 7h2M16 7h2M11 17h2"/>',
  diagnostics: '<path d="M2 12h4l2-5 4 10 3-7 2 2h5"/><circle cx="4" cy="18" r="2"/><path d="m5.5 19.5 2 2M16 4h5M18.5 1.5v5"/>'
}

const nodes: Node[] = [
  { key: 'dns', label: 'DNS', color: '#2C97CC', link: '/zh/guide/mosdns', x: 50, y: 17.5, line: [200, 140, 200, 90], icon: ICONS.dns, delay: '0s' },
  { key: 'proxy', label: '代理', color: '#3666AC', link: '/zh/guide/proxy', x: 78.25, y: 33.75, line: [252, 170, 295, 145], icon: ICONS.proxy, delay: '-.2s' },
  { key: 'home', label: '组网', color: '#3B3E8F', link: '/zh/guide/home', x: 78.25, y: 66.25, line: [252, 230, 295, 255], icon: ICONS.home, delay: '-.4s' },
  { key: 'domain', label: '域名', color: '#3F73B5', link: '/zh/guide/domain-services', x: 50, y: 82.5, line: [200, 260, 200, 310], icon: ICONS.domain, delay: '-.6s' },
  { key: 'docker', label: 'Docker', color: '#F68A35', link: '/zh/guide/docker-center', x: 21.75, y: 66.25, line: [148, 230, 105, 255], icon: ICONS.docker, delay: '-.8s' },
  { key: 'diag', label: '诊断', color: '#F99739', link: '/zh/guide/network-tools', x: 21.75, y: 33.75, line: [148, 170, 105, 145], icon: ICONS.diagnostics, delay: '-1s' }
]
</script>

<template>
  <div class="msm-net" role="img" aria-label="MSM 作为家庭网络中枢，连接 DNS、代理、组网、域名、Docker 与诊断">
    <!-- 连线层 -->
    <svg class="msm-net-wires" viewBox="0 0 400 400" aria-hidden="true">
      <defs>
        <radialGradient id="msm-net-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--msm-brand)" stop-opacity="0.18" />
          <stop offset="70%" stop-color="var(--msm-brand)" stop-opacity="0" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="150" fill="url(#msm-net-core)" />
      <g v-for="n in nodes" :key="n.key">
        <line
          :x1="n.line[0]" :y1="n.line[1]" :x2="n.line[2]" :y2="n.line[3]"
          :stroke="n.color" stroke-opacity="0.22" stroke-width="1.5"
        />
        <line
          class="msm-net-flow"
          :x1="n.line[0]" :y1="n.line[1]" :x2="n.line[2]" :y2="n.line[3]"
          :stroke="n.color" stroke-width="1.75" stroke-linecap="round"
          :style="{ animationDelay: n.delay }"
        />
      </g>
    </svg>

    <!-- 中心枢纽：logo -->
    <div class="msm-net-core">
      <img :src="withBase('/logo/logo-square.svg')" alt="MSM" width="120" height="120" />
    </div>

    <!-- 服务节点 -->
    <a
      v-for="n in nodes"
      :key="n.key"
      class="msm-net-node"
      :href="withBase(n.link)"
      :style="{ left: n.x + '%', top: n.y + '%' }"
    >
      <span class="msm-net-badge" :style="{ color: n.color, borderColor: n.color }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" v-html="n.icon" />
      </span>
      <span class="msm-net-label">{{ n.label }}</span>
    </a>
  </div>
</template>

<style scoped>
.msm-net {
  position: relative;
  width: 100%;
  max-width: 420px;
  margin-inline: auto;
  aspect-ratio: 1;
}

.msm-net-wires {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* 流动虚线：dashoffset 无限位移，像数据在链路上跑 */
.msm-net-flow {
  stroke-dasharray: 4 12;
  animation: msm-net-flow 1.3s linear infinite;
}

@keyframes msm-net-flow {
  to {
    stroke-dashoffset: -16;
  }
}

/* 中心 logo */
.msm-net-core {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 33%;
  height: 33%;
  animation: msm-net-breathe 6s var(--msm-ease) infinite;
}

.msm-net-core img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 8px 22px rgba(12, 21, 38, 0.18));
}

@keyframes msm-net-breathe {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.04);
  }
}

/* 服务节点：图标徽章 + 等宽标签 */
.msm-net-node {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-decoration: none !important;
  transition: transform var(--msm-base);
}

.msm-net-node:hover {
  transform: translate(-50%, -50%) scale(1.08);
}

.msm-net-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border: 1.5px solid currentColor;
  border-radius: var(--msm-radius-full);
  background: var(--msm-glass-bg-strong);
  -webkit-backdrop-filter: blur(10px) saturate(160%);
  backdrop-filter: blur(10px) saturate(160%);
  box-shadow: 0 4px 14px rgba(12, 21, 38, 0.1);
}

.msm-net-badge svg {
  width: 23px;
  height: 23px;
}

.msm-net-label {
  font-family: var(--msm-font-mono);
  font-size: var(--msm-text-2xs);
  font-weight: var(--msm-weight-medium);
  letter-spacing: var(--msm-tracking-label);
  text-transform: uppercase;
  color: var(--msm-ink-2);
  white-space: nowrap;
}

@media (max-width: 767px) {
  .msm-net {
    max-width: 320px;
  }
  .msm-net-badge {
    width: 38px;
    height: 38px;
  }
  .msm-net-badge svg {
    width: 19px;
    height: 19px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .msm-net-flow {
    animation: none;
    stroke-dasharray: none;
    stroke-opacity: 0.5;
  }
  .msm-net-core {
    animation: none;
  }
}
</style>
