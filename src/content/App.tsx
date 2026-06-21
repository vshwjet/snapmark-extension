import { useCallback, useEffect, useRef, useState } from 'react'
import type { Annotation, AnnotationMode, BoundingBox, ElementInfo } from './types'
import { Overlay } from './components/Overlay'
import { Popover } from './components/Popover'
import { FloatingToolbar } from './components/FloatingToolbar'
import { captureRegion } from './utils/screenshot'
import { generateMarkdown } from './utils/markdown'
import { getImgbbKey, uploadToImgbb } from './utils/imgbb'

type PendingCapture = {
  box: BoundingBox
  screenshot: string
  elementInfo?: ElementInfo
}

export function App() {
  const [isVisible, setIsVisible] = useState(() => {
    try { return sessionStorage.getItem('snapmark-visible') === '1' } catch { return false }
  })
  const [isActive, setIsActive] = useState(false)
  const [mode, setMode] = useState<AnnotationMode>('inspect')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [pending, setPending] = useState<PendingCapture | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadingBox, setUploadingBox] = useState<BoundingBox | null>(null)

  // Persist isVisible across reloads (sessionStorage cleared when tab is closed)
  useEffect(() => {
    try {
      if (isVisible) sessionStorage.setItem('snapmark-visible', '1')
      else sessionStorage.removeItem('snapmark-visible')
    } catch { /* ignore */ }
  }, [isVisible])

  // Load annotations for this page from chrome.storage.local on mount
  const annotationsLoaded = useRef(false)
  const pageKey = window.location.hostname
  useEffect(() => {
    chrome.storage.local.get(['snapmark-annotations'], (result) => {
      const all = (result['snapmark-annotations'] ?? {}) as Record<string, Annotation[]>
      const forPage = all[pageKey] ?? []
      setAnnotations(forPage)
      annotationsLoaded.current = true
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Save annotations — only after initial load to avoid overwriting with empty state
  useEffect(() => {
    if (!annotationsLoaded.current) return
    chrome.storage.local.get(['snapmark-annotations'], (result) => {
      const all = (result['snapmark-annotations'] ?? {}) as Record<string, Annotation[]>
      if (annotations.length === 0) delete all[pageKey]
      else all[pageKey] = annotations
      chrome.storage.local.set({ 'snapmark-annotations': all })
    })
  }, [annotations]) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for activation message from extension popup
  useEffect(() => {
    const listener = (msg: { type: string }) => {
      if (msg.type === 'SNAPMARK_ACTIVATE') {
        setIsVisible(true)
        setIsActive(true)
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  // Keyboard shortcut: Cmd+Shift+A / Ctrl+Shift+A (toggles QA mode when visible)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        if (!isVisible) return
        setIsActive((prev) => !prev)
        setPending(null)
      }
      if (e.key === 'Escape') {
        if (pending) setPending(null)
        else if (isActive) { setIsActive(false) }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [pending, isVisible])

  // Hold Shift → switch to area mode while active
  useEffect(() => {
    if (!isActive) return
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift' && !pending) setMode('area') }
    const up   = (e: KeyboardEvent) => { if (e.key === 'Shift') setMode('inspect') }
    document.addEventListener('keydown', down)
    document.addEventListener('keyup', up)
    return () => {
      document.removeEventListener('keydown', down)
      document.removeEventListener('keyup', up)
    }
  }, [isActive, pending])

  const handleCapture = useCallback(
    async (box: BoundingBox, elementInfo?: ElementInfo) => {
      if (isCapturing || isUploading) return
      setIsCapturing(true)

      const apiKey = await getImgbbKey()
      if (!apiKey) {
        setIsCapturing(false)
        setPending({ box, screenshot: '', elementInfo })
        return
      }

      try {
        const base64 = await captureRegion(box)
        setIsCapturing(false)

        let screenshot = base64
        if (apiKey) {
          setIsUploading(true)
          setUploadingBox(box)
          setUploadError(null)
          try {
            screenshot = await uploadToImgbb(base64, apiKey)
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Upload failed'
            setUploadError(msg)
            screenshot = base64 // fall back to base64
          } finally {
            setIsUploading(false)
            setUploadingBox(null)
          }
        }

        setPending({ box, screenshot, elementInfo })
      } catch (err) {
        console.error('[Snapmark] Screenshot capture failed:', err)
        setIsCapturing(false)
      }
    },
    [isCapturing, isUploading]
  )

  const handleAdd = useCallback(
    (comment: string) => {
      if (!pending) return
      const annotation: Annotation = {
        id: crypto.randomUUID(),
        index: annotations.length + 1,
        screenshot: pending.screenshot,
        comment,
        boundingBox: pending.box,
        elementInfo: pending.elementInfo,
        pageUrl: window.location.href,
        timestamp: Date.now(),
      }
      setAnnotations((prev) => [...prev, annotation])
      setPending(null)
    },
    [pending, annotations.length]
  )

  const handleDelete = useCallback((id: string) => {
    setAnnotations((prev) => {
      const next = prev.filter((a) => a.id !== id)
      return next.map((a, i) => ({ ...a, index: i + 1 }))
    })
  }, [])

  const handleClearAll = useCallback(() => {
    setAnnotations([])
    setPending(null)
  }, [])

  const handleCopyMarkdown = useCallback(async () => {
    const md = generateMarkdown(annotations)
    try {
      await navigator.clipboard.writeText(md)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = md
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  }, [annotations])

  const showOverlay = isActive && !pending && !isCapturing && !isUploading

  if (!isVisible) return null

  return (
    <div className="dqa-root" data-snapmark-ignore>
      <FloatingToolbar
        isActive={isActive}
        mode={mode}
        annotations={annotations}
        isUploading={isUploading}
        uploadError={uploadError}
        onActivate={() => setIsActive(true)}
        onDeactivate={() => { setIsActive(false); setPending(null) }}
        onDismiss={() => { setIsVisible(false); setIsActive(false); setPending(null) }}
        onModeChange={setMode}
        onDelete={handleDelete}
        onClearAll={handleClearAll}
        onCopyMarkdown={handleCopyMarkdown}
      />

      {showOverlay && (
        <Overlay
          mode={mode}
          onInspectCapture={(box, info) => handleCapture(box, info)}
          onAreaCapture={(box) => handleCapture(box)}
        />
      )}


      {uploadingBox && isUploading && (
        <UploadIndicator box={uploadingBox} />
      )}

      {pending && (
        <Popover
          box={pending.box}
          screenshot={pending.screenshot}
          onAdd={handleAdd}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}

function UploadIndicator({ box }: { box: BoundingBox }) {
  const cx = box.x - window.scrollX + box.width / 2
  const cy = box.y - window.scrollY + box.height / 2
  return (
    <>
      <div
        className="dqa-uploading-region"
        data-snapmark-ignore
        style={{ left: box.x - window.scrollX, top: box.y - window.scrollY, width: box.width, height: box.height }}
      />
      <div
        className="dqa-upload-indicator"
        data-snapmark-ignore
        style={{ left: cx, top: cy }}
      >
        <span className="dqa-upload-spinner" />
        Uploading…
      </div>
    </>
  )
}
