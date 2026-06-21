import { useCallback, useEffect, useRef, useState } from 'react'
import type { Annotation, AnnotationMode } from '../types'

const STORAGE_KEY = 'dqa-toolbar-position-v2'
const DRAG_THRESHOLD = 10

interface FloatingToolbarProps {
  isActive: boolean
  mode: AnnotationMode
  annotations: Annotation[]
  isUploading: boolean
  uploadError: string | null
  onActivate: () => void
  onDeactivate: () => void
  onDismiss: () => void
  onModeChange: (mode: AnnotationMode) => void
  onDelete: (id: string) => void
  onClearAll: () => void
  onCopyMarkdown: () => void
}

function getInitialPosition() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as { x: number; y: number }
  } catch { /* ignore */ }
  return { x: 20, y: window.innerHeight - 44 - 20 }
}

function savePosition(pos: { x: number; y: number }) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)) } catch { /* ignore */ }
}

function clampPos(pos: { x: number; y: number }) {
  if (typeof window === 'undefined') return pos
  const pad = 8
  return {
    x: Math.max(pad, Math.min(window.innerWidth - 44 - pad, pos.x)),
    y: Math.max(pad, Math.min(window.innerHeight - 44 - pad, pos.y)),
  }
}

// ── Tooltip warm-group state ─────────────────────────────────────────────────
let _tooltipWarm = false
let _coolTimer: ReturnType<typeof setTimeout> | null = null

function markTooltipWarm() {
  _tooltipWarm = true
  if (_coolTimer) { clearTimeout(_coolTimer); _coolTimer = null }
}

function scheduleTooltipCool() {
  if (_coolTimer) clearTimeout(_coolTimer)
  _coolTimer = setTimeout(() => { _tooltipWarm = false }, 400)
}

function useTooltip() {
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    const delay = _tooltipWarm ? 0 : 1000
    timer.current = setTimeout(() => {
      markTooltipWarm()
      setVisible(true)
    }, delay)
  }, [])

  const hide = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    setVisible(false)
    scheduleTooltipCool()
  }, [])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return { visible, show, hide }
}

function DQATooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const { visible, show, hide } = useTooltip()
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [tipPos, setTipPos] = useState({ x: 0, y: 0 })

  const handleMouseEnter = () => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect()
      const TOOLTIP_H = 26
      const y = r.bottom + 6 + TOOLTIP_H > window.innerHeight
        ? r.top - TOOLTIP_H - 6
        : r.bottom + 6
      setTipPos({ x: Math.round(r.left + r.width / 2), y: Math.round(y) })
    }
    show()
  }

  return (
    <span ref={anchorRef} className="dqa-tooltip-anchor" onMouseEnter={handleMouseEnter} onMouseLeave={hide}>
      {children}
      {visible && (
        <span className="dqa-tooltip" data-snapmark-ignore style={{ left: tipPos.x, top: tipPos.y }}>
          {text}
        </span>
      )}
    </span>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function FloatingToolbar({
  isActive,
  mode,
  annotations,
  isUploading,
  uploadError,
  onActivate,
  onDeactivate,
  onDismiss,
  onModeChange,
  onDelete,
  onClearAll,
  onCopyMarkdown,
}: FloatingToolbarProps) {
  const [showPanel, setShowPanel] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<{ mx: number; my: number; tx: number; ty: number } | null>(null)
  const justDragged = useRef(false)

  useEffect(() => { setPos(getInitialPosition()) }, [])
  useEffect(() => { if (!isActive) { setShowPanel(false); setShowSettings(false) } }, [isActive])

  useEffect(() => {
    const handler = () => setPos((p) => p ? clampPos(p) : p)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const handleGripMouseDown = useCallback((e: React.MouseEvent) => {
    if (!pos) return
    e.preventDefault()
    dragRef.current = { mx: e.clientX, my: e.clientY, tx: pos.x, ty: pos.y }
  }, [pos])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.mx
      const dy = e.clientY - dragRef.current.my
      if (!isDragging && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      if (!isDragging) setIsDragging(true)
      setPos(clampPos({ x: dragRef.current.tx - dx, y: dragRef.current.ty + dy }))
    }
    const onUp = (e: MouseEvent) => {
      if (!dragRef.current) return
      if (isDragging) {
        const finalPos = clampPos({
          x: dragRef.current.tx - (e.clientX - dragRef.current.mx),
          y: dragRef.current.ty + (e.clientY - dragRef.current.my),
        })
        savePosition(finalPos)
        justDragged.current = true
        setTimeout(() => { justDragged.current = false }, 50)
      }
      dragRef.current = null
      setIsDragging(false)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [isDragging])

  const handleActivate = () => {
    if (justDragged.current) return
    onActivate()
  }

  if (!pos) return null

  return (
    <div
      className="dqa-floating"
      data-snapmark-ignore
      style={{ right: pos.x, top: pos.y }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      {showPanel && isActive && (
        <AnnotationsPanel
          annotations={annotations}
          onDelete={onDelete}
          onClearAll={onClearAll}
          onCopyMarkdown={() => { onCopyMarkdown(); setShowPanel(false) }}
        />
      )}

      {showSettings && isActive && <SettingsPanel />}

      <div className={`dqa-pill${isActive ? ' dqa-pill-expanded' : ' dqa-pill-collapsed'}`}>
        {!isActive ? (
          <button
            className="dqa-pill-icon-btn"
            onClick={handleActivate}
            title="Activate Snapmark (⌘⇧A)"
          >
            <AnnotateIcon />
            {annotations.length > 0 && (
              <span className="dqa-pill-badge">{annotations.length}</span>
            )}
          </button>
        ) : (
          <>
            <div
              className="dqa-grip"
              onMouseDown={handleGripMouseDown}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              {(isUploading || uploadError) && (
                <span
                  className={uploadError ? 'dqa-pill-dot dqa-pill-dot-error' : 'dqa-pill-dot dqa-pill-dot-uploading'}
                  style={{ position: 'absolute', top: '6px', right: '4px' }}
                  title={uploadError ?? undefined}
                />
              )}
              <GripDotsIcon />
            </div>

            <span className="dqa-pill-sep" />

            {!isUploading && (
              <div className="dqa-mode-group">
                <DQATooltip text="Click elements to annotate">
                  <button
                    className={`dqa-mode-btn${mode === 'inspect' ? ' dqa-active' : ''}`}
                    onClick={() => onModeChange('inspect')}
                  >
                    Inspect
                  </button>
                </DQATooltip>
                <DQATooltip text="Drag to select area">
                  <button
                    className={`dqa-mode-btn${mode === 'area' ? ' dqa-active' : ''}`}
                    onClick={() => onModeChange('area')}
                  >
                    Area
                  </button>
                </DQATooltip>
              </div>
            )}

            <DQATooltip text="View annotations">
              <button
                className={`dqa-pill-btn${showPanel ? ' dqa-active' : ''}`}
                onClick={() => { setShowPanel((v) => !v); setShowSettings(false) }}
              >
                <ListIcon />
                {annotations.length > 0 && (
                  <span className="dqa-btn-badge">{annotations.length}</span>
                )}
              </button>
            </DQATooltip>

            {annotations.length > 0 && (
              <DQATooltip text="Copy as Markdown">
                <button className="dqa-pill-btn" onClick={onCopyMarkdown}>
                  <CopyIcon />
                </button>
              </DQATooltip>
            )}

            <DQATooltip text="imgBB settings">
              <button
                className={`dqa-pill-btn${showSettings ? ' dqa-active' : ''}`}
                onClick={() => { setShowSettings((v) => !v); setShowPanel(false) }}
              >
                <SlidersIcon />
              </button>
            </DQATooltip>

            <span className="dqa-pill-sep" />

            <DQATooltip text="Minimise (Esc)">
              <button className="dqa-pill-btn" onClick={onDeactivate}>
                <MinimizeIcon />
              </button>
            </DQATooltip>

            <DQATooltip text="Close Snapmark">
              <button className="dqa-pill-btn dqa-pill-btn-dismiss" onClick={onDismiss}>
                <TrashIcon />
              </button>
            </DQATooltip>
          </>
        )}
      </div>
    </div>
  )
}

// ── Annotations panel ────────────────────────────────────────────────────────

interface AnnotationsPanelProps {
  annotations: Annotation[]
  onDelete: (id: string) => void
  onClearAll: () => void
  onCopyMarkdown: () => void
}

function AnnotationsPanel({ annotations, onDelete, onClearAll, onCopyMarkdown }: AnnotationsPanelProps) {
  return (
    <div className="dqa-panel">
      <div className="dqa-panel-header">
        <span className="dqa-panel-title">
          {annotations.length} Annotation{annotations.length !== 1 ? 's' : ''}
        </span>
        {annotations.length > 0 && (
          <button className="dqa-panel-clear-btn" onClick={onClearAll}>
            Clear all
          </button>
        )}
      </div>

      <div className="dqa-panel-list">
        {annotations.length === 0 ? (
          <div className="dqa-panel-empty">
            No annotations yet.
            <br />Click an element or drag an area to start.
          </div>
        ) : (
          annotations.map((a) => (
            <div key={a.id} className="dqa-panel-item">
              <div className="dqa-panel-text">
                <div className="dqa-panel-comment">{a.comment}</div>
              </div>
              <button
                className="dqa-panel-delete"
                onClick={() => onDelete(a.id)}
                title="Delete"
              >
                <CloseIcon />
              </button>
            </div>
          ))
        )}
      </div>

      {annotations.length > 0 && (
        <div className="dqa-panel-footer">
          <button className="dqa-panel-copy-btn" onClick={onCopyMarkdown}>
            Copy Markdown
          </button>
        </div>
      )}
    </div>
  )
}

// ── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel() {
  const [apiKey, setApiKey] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [status, setStatus] = useState<{ text: string; tone: 'ok' | 'error' | 'neutral' } | null>(null)
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    chrome.storage.sync.get('imgbbApiKey', (result) => {
      if (result.imgbbApiKey) setApiKey(result.imgbbApiKey)
    })
    return () => { if (statusTimer.current) clearTimeout(statusTimer.current) }
  }, [])

  const flashStatus = (text: string, tone: 'ok' | 'error' | 'neutral') => {
    setStatus({ text, tone })
    if (statusTimer.current) clearTimeout(statusTimer.current)
    statusTimer.current = setTimeout(() => setStatus(null), 2000)
  }

  const handleSave = () => {
    const key = apiKey.trim()
    if (!key) {
      flashStatus('Enter a key first', 'error')
      return
    }
    chrome.storage.sync.set({ imgbbApiKey: key }, () => flashStatus('Saved', 'ok'))
  }

  const handleClear = () => {
    setApiKey('')
    chrome.storage.sync.remove('imgbbApiKey', () => flashStatus('Cleared', 'neutral'))
  }

  return (
    <div className="dqa-panel dqa-settings-panel">
      <div className="dqa-panel-header">
        <span className="dqa-panel-title">imgBB API Key</span>
        {status && (
          <span className={`dqa-settings-status dqa-settings-status-${status.tone}`}>{status.text}</span>
        )}
      </div>

      <div className="dqa-settings-body">
        <div className="dqa-settings-input-row">
          <input
            className="dqa-settings-input"
            type={revealed ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your imgBB API key"
            spellCheck={false}
          />
          <button className="dqa-settings-reveal-btn" onClick={() => setRevealed((v) => !v)}>
            {revealed ? 'Hide' : 'Show'}
          </button>
        </div>

        <div className="dqa-settings-actions">
          <button className="dqa-settings-clear-btn" onClick={handleClear}>Clear</button>
          <button className="dqa-settings-save-btn" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}

// ── Icons ────────────────────────────────────────────────────────────────────

function AnnotateIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 16l2.5-3.5h1L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="5" y1="5.5" x2="13" y2="5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="5" y1="8.5" x2="10" y2="8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function GripDotsIcon() {
  return (
    <svg width="12" height="15" viewBox="0 0 12 15" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="4" cy="3" r="1.2" />
      <circle cx="8" cy="3" r="1.2" />
      <circle cx="4" cy="7.5" r="1.2" />
      <circle cx="8" cy="7.5" r="1.2" />
      <circle cx="4" cy="12" r="1.2" />
      <circle cx="8" cy="12" r="1.2" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="4" y1="4" x2="12" y2="4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="4" y1="7.5" x2="12" y2="7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="4" y1="11" x2="9" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="2" cy="4" r="0.8" fill="currentColor" />
      <circle cx="2" cy="7.5" r="0.8" fill="currentColor" />
      <circle cx="2" cy="11" r="0.8" fill="currentColor" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="1.5" width="8.5" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 5H2a1.5 1.5 0 00-1.5 1.5v7A1.5 1.5 0 002 15h7a1.5 1.5 0 001.5-1.5V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function SlidersIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="1" y1="3.5" x2="14" y2="3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="1" y1="7.5" x2="14" y2="7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="1" y1="11.5" x2="14" y2="11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="4.5" cy="3.5" r="1.8" fill="#1a1a1a" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="7.5" r="1.8" fill="#1a1a1a" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="6" cy="11.5" r="1.8" fill="#1a1a1a" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function MinimizeIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 6h8M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="13" y1="1" x2="13" y2="11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="14" viewBox="0 0 13 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 3.5h11M4.5 3.5V2h4v1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 3.5l.8 8.5h7.4L11 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="5" y1="6.5" x2="5" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="8" y1="6.5" x2="8" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
