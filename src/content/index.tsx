import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import cssText from './styles/snapmark.css?inline'

// Guard: don't inject twice (e.g. if content script is re-run)
if (!document.getElementById('snapmark-ext-root')) {
  // Create the shadow host — positioned at document origin with no intrinsic size.
  // Children with position:absolute use document coordinates (pins).
  // Children with position:fixed use viewport coordinates (overlay, toolbar, popover).
  const host = document.createElement('div')
  host.id = 'snapmark-ext-root'
  host.setAttribute('data-snapmark-ignore', '')
  host.style.cssText = [
    'position: absolute',
    'top: 0',
    'left: 0',
    'width: 0',
    'height: 0',
    'pointer-events: none',
    // Keep the entire extension above app chrome like sidebars, drawers, and modals.
    // Child z-index values cannot escape the host's stacking context.
    'z-index: 2147483000',
    'overflow: visible',
  ].join('; ')

  // Attach to <html> rather than <body> to avoid affecting page layout
  document.documentElement.appendChild(host)

  // Open shadow root for style isolation
  const shadow = host.attachShadow({ mode: 'open' })

  // Inject styles into the shadow root (imported as a string via ?inline)
  const style = document.createElement('style')
  style.textContent = cssText
  shadow.appendChild(style)

  // React mount container
  const container = document.createElement('div')
  container.style.cssText = 'position: absolute; top: 0; left: 0; overflow: visible;'
  shadow.appendChild(container)

  // Mount React app
  createRoot(container).render(React.createElement(App))
}
