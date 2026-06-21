import type { BoundingBox } from '../types'

const CONTEXT_PADDING = 20

/**
 * Captures a cropped screenshot of the selected region.
 * Hides the snapmark host element before capture so the tool UI
 * never bleeds into the screenshot.
 */
export async function captureRegion(box: BoundingBox): Promise<string> {
  // Hide snapmark UI before capture (visibility inherits into shadow DOM)
  const host = document.getElementById('snapmark-ext-root') as HTMLElement | null
  const prevVisibility = host?.style.visibility ?? ''
  const prevPointerEvents = host?.style.pointerEvents ?? ''
  if (host) {
    host.style.visibility = 'hidden'
    host.style.pointerEvents = 'none'
  }

  // Two rAF frames to ensure the host is visually gone before the screenshot
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

  let dataUrl: string
  try {
    const response = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }) as
      | { dataUrl: string }
      | { error: string }

    if ('error' in response) {
      throw new Error(`Screenshot failed: ${response.error}`)
    }
    dataUrl = response.dataUrl
  } finally {
    if (host) {
      host.style.visibility = prevVisibility
      host.style.pointerEvents = prevPointerEvents
    }
  }

  const img = await loadImage(dataUrl)
  const dpr = window.devicePixelRatio || 1

  // box coords are document-relative (include scroll); captureVisibleTab is viewport-relative
  const viewX = box.x - window.scrollX
  const viewY = box.y - window.scrollY

  // Expand capture area with surrounding context, clamped to viewport bounds
  const srcX = Math.max(0, viewX - CONTEXT_PADDING)
  const srcY = Math.max(0, viewY - CONTEXT_PADDING)
  const srcW = Math.min(window.innerWidth - srcX, box.width + CONTEXT_PADDING * 2)
  const srcH = Math.min(window.innerHeight - srcY, box.height + CONTEXT_PADDING * 2)

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(srcW * dpr)
  canvas.height = Math.round(srcH * dpr)

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    img,
    Math.round(srcX * dpr), Math.round(srcY * dpr),
    Math.round(srcW * dpr), Math.round(srcH * dpr),
    0, 0,
    canvas.width, canvas.height,
  )

  return canvas.toDataURL('image/png')
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
