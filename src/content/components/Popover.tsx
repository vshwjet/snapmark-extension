import React, { useEffect, useRef, useState } from 'react'
import type { BoundingBox } from '../types'

interface PopoverProps {
  box: BoundingBox
  screenshot: string
  onAdd: (comment: string) => void
  onCancel: () => void
}

export function Popover({ box, screenshot, onAdd, onCancel }: PopoverProps) {
  const [comment, setComment] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  const POPOVER_WIDTH = 300
  const POPOVER_HEIGHT = 220
  const GAP = 8

  const boxLeft = box.x - window.scrollX
  const boxTop = box.y - window.scrollY
  const boxBottom = boxTop + box.height

  let left = boxLeft
  let top = boxBottom + GAP

  const vw = window.innerWidth
  if (left + POPOVER_WIDTH > vw - 8) left = vw - POPOVER_WIDTH - 8
  if (left < 8) left = 8

  const vh = window.innerHeight
  if (top + POPOVER_HEIGHT > vh - 8) top = boxTop - POPOVER_HEIGHT - GAP
  if (top < 48) top = 48

  const handleAdd = () => {
    if (!comment.trim()) return
    onAdd(comment.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd()
  }

  return (
    <div
      ref={popoverRef}
      className="dqa-popover"
      data-snapmark-ignore
      style={{ left, top }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      {screenshot ? (
        <img
          className="dqa-popover-thumb"
          src={screenshot}
          alt="Selection preview"
          draggable={false}
        />
      ) : (
        <div className="dqa-popover-no-screenshot">
          Add an imgBB API key in settings to enable screenshots
        </div>
      )}

      <div className="dqa-popover-body">
        <textarea
          ref={textareaRef}
          className="dqa-popover-textarea"
          placeholder="Describe the issue… (⌘↵ to add)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <div className="dqa-popover-actions">
          <button className="dqa-btn dqa-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="dqa-btn dqa-btn-primary" onClick={handleAdd} disabled={!comment.trim()}>
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
