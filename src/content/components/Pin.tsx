import type { Annotation } from '../types'

interface PinProps {
  annotation: Annotation
  isHighlighted: boolean
  onClick: (id: string) => void
  onHover: (id: string | null) => void
}

export function Pin({ annotation, isHighlighted, onClick, onHover }: PinProps) {
  const { boundingBox, priority, index, id } = annotation

  return (
    <div
      className={`dqa-pin dqa-pin-${priority}${isHighlighted ? ' dqa-pin-highlighted' : ''}`}
      data-snapmark-ignore
      style={{
        position: 'absolute',
        left: boundingBox.x,
        top: boundingBox.y,
      }}
      onClick={() => onClick(id)}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      title={`#${index}: ${annotation.comment.slice(0, 60)}`}
    >
      <span className="dqa-pin-number">{index}</span>
    </div>
  )
}
