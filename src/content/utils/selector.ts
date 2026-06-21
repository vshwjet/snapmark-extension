import type { ElementInfo } from '../types'

const TEXT_TAGS = new Set(['a', 'button', 'label', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'li', 'td', 'th', 'caption', 'figcaption', 'legend'])

const IMPLICIT_ROLES: Record<string, string> = {
  a: 'link', button: 'button', input: 'textbox', select: 'listbox',
  textarea: 'textbox', img: 'img', nav: 'navigation', main: 'main',
  header: 'banner', footer: 'contentinfo', aside: 'complementary',
  section: 'region', article: 'article', form: 'form',
  h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading',
  ul: 'list', ol: 'list', li: 'listitem', table: 'table', tr: 'row', td: 'cell', th: 'columnheader',
}

export function getElementInfo(el: Element): ElementInfo {
  const tag = el.tagName.toLowerCase()

  let text: string | undefined
  if (TEXT_TAGS.has(tag)) {
    const raw = el.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    if (raw.length > 0 && raw.length <= 80) text = raw
  }
  if (!text) {
    if (tag === 'img') text = el.getAttribute('alt') ?? undefined
    else if (tag === 'input' || tag === 'textarea')
      text = (el as HTMLInputElement).value || el.getAttribute('placeholder') || undefined
  }

  const label =
    el.getAttribute('aria-label') ||
    el.getAttribute('title') ||
    (tag !== 'input' && tag !== 'textarea' ? null : el.getAttribute('placeholder')) ||
    undefined

  const role =
    el.getAttribute('role') ||
    (tag === 'input' ? (el.getAttribute('type') ?? 'textbox') : null) ||
    IMPLICIT_ROLES[tag] ||
    undefined

  const ATTR_KEYS = ['type', 'name', 'href', 'for', 'src', 'action', 'method', 'data-testid', 'data-cy', 'data-id', 'data-qa', 'id']
  const attrs: string[] = []
  for (const key of ATTR_KEYS) {
    const val = el.getAttribute(key)
    if (val) attrs.push(`${key}="${val}"`)
  }

  return {
    tag,
    text,
    label,
    role,
    attrs,
    classPath: buildClassPath(el),
    selector: buildTagPath(el),
  }
}

function buildClassPath(el: Element): string {
  const parts: string[] = []
  let current: Element | null = el
  for (let depth = 0; depth < 5 && current && current !== document.body; depth++) {
    const classes = Array.from(current.classList)
    if (classes.length > 0) {
      parts.unshift('.' + classes.slice(0, 3).join('.'))
    } else {
      parts.unshift(current.tagName.toLowerCase())
    }
    current = current.parentElement
  }
  return parts.join(' > ') || el.tagName.toLowerCase()
}

function buildTagPath(el: Element): string {
  const parts: string[] = []
  let current: Element | null = el
  for (let depth = 0; depth < 4 && current && current !== document.body; depth++) {
    let seg = current.tagName.toLowerCase()
    if (current.id) seg += `#${current.id}`
    parts.unshift(seg)
    current = current.parentElement
  }
  return parts.join(' > ') || el.tagName.toLowerCase()
}
