<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const activeSrc = ref('')
const activeAlt = ref('')
const closeBtnRef = ref<HTMLButtonElement | null>(null)
let previouslyFocused: HTMLElement | null = null

function openLightbox(img: HTMLImageElement) {
  previouslyFocused = document.activeElement as HTMLElement | null
  activeSrc.value = img.currentSrc || img.src
  activeAlt.value = img.alt || ''
  document.body.classList.add('msm-lightbox-open')
  requestAnimationFrame(() => closeBtnRef.value?.focus())
}

function closeLightbox() {
  if (!activeSrc.value) return
  activeSrc.value = ''
  activeAlt.value = ''
  document.body.classList.remove('msm-lightbox-open')
  previouslyFocused?.focus()
  previouslyFocused = null
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target
  if (!(target instanceof HTMLImageElement)) return
  if (!target.closest('.vp-doc')) return
  if (target.closest('a, [data-no-zoom]')) return
  if (target.naturalWidth > 0 && target.naturalWidth < 120) return
  event.preventDefault()
  openLightbox(target)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && activeSrc.value) {
    event.preventDefault()
    closeLightbox()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
  document.body.classList.remove('msm-lightbox-open')
})
</script>

<template>
  <Teleport to="body">
    <Transition name="msm-lightbox-fade">
      <div
        v-if="activeSrc"
        class="msm-lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="activeAlt || '图片预览'"
        @click.self="closeLightbox"
      >
        <button
          ref="closeBtnRef"
          type="button"
          class="msm-lightbox-close"
          aria-label="关闭预览"
          @click="closeLightbox"
        >
          ×
        </button>
        <figure class="msm-lightbox-figure" @click.self="closeLightbox">
          <img :src="activeSrc" :alt="activeAlt" class="msm-lightbox-img" />
          <figcaption v-if="activeAlt" class="msm-lightbox-caption">
            {{ activeAlt }}
          </figcaption>
        </figure>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.msm-lightbox {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(8, 13, 26, 0.82);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  cursor: zoom-out;
}

.msm-lightbox-close {
  position: fixed;
  top: 18px;
  right: 22px;
  z-index: 121;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: var(--msm-radius-md);
  background: rgba(12, 20, 40, 0.72);
  color: #f1f5f9;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  transition: border-color var(--msm-fast), background-color var(--msm-fast);
}

.msm-lightbox-close:hover {
  border-color: var(--msm-accent);
  background: rgba(12, 20, 40, 0.92);
}

.msm-lightbox-figure {
  margin: 0;
  max-width: min(94vw, 1360px);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.msm-lightbox-img {
  max-width: 100%;
  max-height: calc(90vh - 48px);
  width: auto;
  height: auto;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: var(--msm-radius-md);
  background: var(--msm-bg);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
  cursor: default;
}

.msm-lightbox-caption {
  max-width: 72ch;
  text-align: center;
  font-size: var(--msm-text-sm);
  color: #e2e8f0;
  line-height: var(--msm-leading-snug);
}

.msm-lightbox-fade-enter-active,
.msm-lightbox-fade-leave-active {
  transition: opacity 160ms ease;
}

.msm-lightbox-fade-enter-from,
.msm-lightbox-fade-leave-to {
  opacity: 0;
}
</style>
