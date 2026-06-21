export type BoundingBox = {
  x: number       // px from left of viewport
  y: number       // px from top of document (includes scroll)
  width: number
  height: number
}

export type ElementInfo = {
  tag: string
  text?: string
  label?: string
  role?: string
  attrs: string[]
  classPath: string
  selector: string
}

export type Annotation = {
  id: string
  index: number
  screenshot: string       // base64 PNG cropped to boundingBox
  comment: string
  boundingBox: BoundingBox
  elementInfo?: ElementInfo
  pageUrl: string
  timestamp: number
}

export type AnnotationMode = 'inspect' | 'area'
