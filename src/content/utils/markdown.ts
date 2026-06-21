import type { Annotation, ElementInfo } from '../types'

export function generateMarkdown(annotations: Annotation[]): string {
  const lines: string[] = []

  for (const a of annotations) {
    lines.push(`#${a.index}`)
    lines.push(`Issue: ${a.comment}`)

    if (a.screenshot) {
      lines.push('')
      lines.push(`![Annotation ${a.index}](${a.screenshot})`)
    }

    lines.push('')
    lines.push('--- Selector Info ---')
    lines.push(formatElementInfo(a.elementInfo))

    lines.push('')
    lines.push('---')
    lines.push('')
  }

  // Remove trailing separator
  while (lines[lines.length - 1] === '' || lines[lines.length - 1] === '---') {
    lines.pop()
  }

  return lines.join('\n')
}

function formatElementInfo(info?: ElementInfo): string {
  if (!info) return 'Not available'

  const lines: string[] = []

  let headline = `\`${info.tag}\``
  if (info.text) headline += ` — "${info.text}"`
  else if (info.label) headline += ` — "${info.label}"`
  lines.push(`Element: ${headline}`)

  if (info.role && info.role !== info.tag) {
    lines.push(`Role: \`${info.role}\``)
  }

  if (info.attrs.length > 0) {
    lines.push(`Attrs: ${info.attrs.map((a) => `\`${a}\``).join(' · ')}`)
  }

  lines.push(`Location: \`${info.classPath}\``)

  if (info.selector !== info.classPath) {
    lines.push(`Selector: \`${info.selector}\``)
  }

  return lines.join('\n')
}
