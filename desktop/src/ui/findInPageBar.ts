//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import type { IPCMainExposed } from './types'

const DEBOUNCE_MS = 300

/**
 * Find UI is loaded in a separate BrowserView (see `findInPageOverlayHost.ts`) so
 * `findInPage` on the page webContents does not search the query in this input.
 * Shadow DOM keeps chrome text minimal. Match counts are not shown.
 *
 * Chromium moves focus to the matched text in the **page** webContents after
 * `findInPage`, so the overlay stops receiving keystrokes unless we put focus back
 * on the field after each search (caret is restored from before the call; we do not
 * steal focus on arbitrary blur — only after our own `findInPage`).
 */
export function setupDesktopFindInPageBar (electronApi: IPCMainExposed): void {
  const host = document.createElement('div')
  host.id = 'desktop-find-bar-host'
  host.style.display = 'none'

  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = shadowStyles

  const root = document.createElement('div')
  root.className = 'bar'
  root.setAttribute('role', 'search')

  const input = document.createElement('input')
  input.className = 'field'
  input.type = 'text'
  input.placeholder = ''
  input.autocomplete = 'off'
  input.spellcheck = false
  input.setAttribute('aria-label', 'Find in page')

  const nav = document.createElement('div')
  nav.className = 'nav'
  nav.setAttribute('role', 'group')
  nav.setAttribute('aria-label', 'Find matches')

  const prevBtn = document.createElement('button')
  prevBtn.type = 'button'
  prevBtn.className = 'icon-btn prev'
  prevBtn.setAttribute('aria-label', 'Previous match')
  prevBtn.title = 'Previous (Shift+Enter)'

  const nextBtn = document.createElement('button')
  nextBtn.type = 'button'
  nextBtn.className = 'icon-btn next'
  nextBtn.setAttribute('aria-label', 'Next match')
  nextBtn.title = 'Next (Enter)'

  nav.appendChild(prevBtn)
  nav.appendChild(nextBtn)

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'icon-btn close-x'
  closeBtn.setAttribute('aria-label', 'Close')
  closeBtn.title = 'Close'

  root.appendChild(input)
  root.appendChild(nav)
  root.appendChild(closeBtn)
  shadow.appendChild(style)
  shadow.appendChild(root)
  document.body.appendChild(host)

  let visible = false
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  function getQuery (): string {
    return input.value.trim()
  }

  function updateNavState (): void {
    const q = getQuery()
    prevBtn.disabled = q === ''
    nextBtn.disabled = q === ''
  }

  function show (): void {
    const openingFromHidden = !visible
    visible = true
    host.style.display = 'block'
    try {
      electronApi.notifyFindOverlayLayout(true)
    } catch {
      /* ignore — overlay hit area may be wrong but avoid breaking the window */
    }
    input.focus()
    if (openingFromHidden) {
      input.select()
    }
    updateNavState()
  }

  function hide (): void {
    visible = false
    host.style.display = 'none'
    prevBtn.disabled = true
    nextBtn.disabled = true
    try {
      electronApi.notifyFindOverlayLayout(false)
    } catch {
      /* ignore */
    }
    void electronApi.stopFindInPage('clearSelection').catch(() => {})
  }

  async function find (text: string, options?: { findNext?: boolean, forward?: boolean }): Promise<void> {
    const selStart = input.selectionStart ?? input.value.length
    const selEnd = input.selectionEnd ?? input.value.length
    try {
      await electronApi.findInPage(text, {
        forward: options?.forward ?? true,
        findNext: options?.findNext ?? false
      })
    } catch {
      return
    }
    if (!visible) {
      return
    }
    // Page view steals focus when a match is highlighted; without this, further typing
    // never reaches the input and scheduleFind appears to "stop working".
    input.focus({ preventScroll: true })
    const max = input.value.length
    try {
      input.setSelectionRange(Math.min(selStart, max), Math.min(selEnd, max))
    } catch {
      /* ignored */
    }
  }

  function runFindNext (forward: boolean): void {
    const q = getQuery()
    if (q === '') {
      return
    }
    void find(q, { findNext: true, forward })
  }

  function scheduleFind (): void {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined
      const q = getQuery()
      if (q === '') {
        void electronApi.stopFindInPage('clearSelection').catch(() => {})
        updateNavState()
        return
      }
      void find(q, { findNext: false, forward: true })
    }, DEBOUNCE_MS)
  }

  electronApi.onOpenFindBar(() => {
    show()
    if (getQuery() !== '') {
      scheduleFind()
    }
  })

  input.addEventListener('input', () => {
    scheduleFind()
    updateNavState()
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (getQuery() === '') {
        return
      }
      runFindNext(!e.shiftKey)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      hide()
    }
  })

  prevBtn.addEventListener('click', () => {
    runFindNext(false)
  })

  nextBtn.addEventListener('click', () => {
    runFindNext(true)
  })

  closeBtn.addEventListener('click', () => {
    hide()
  })

  document.addEventListener(
    'keydown',
    (e) => {
      if (!visible || e.key !== 'Escape') {
        return
      }
      const t = e.target as Node
      if (!root.contains(t)) {
        return
      }
      e.stopPropagation()
    },
    true
  )
}

/** Left-pointing chevron; `.next::after` mirrors with `scaleX(-1)` for identical vertical alignment. */
const chevronMaskUrl =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z'/%3E%3C/svg%3E\")"

/** Close (×); same mask + `currentColor` treatment as `.prev` / `.next`. */
const closeIconMaskUrl =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3E%3C/svg%3E\")"

const shadowStyles = `
:host {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.bar {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04);
  color: #1a1a1a;
  font-size: 13px;
}

@media (prefers-color-scheme: dark) {
  .bar {
    background: rgba(42, 42, 46, 0.96);
    box-shadow: 0 2px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08);
    color: #e8e8e8;
  }
}

:host-context([data-theme='theme-dark']) .bar {
  background: rgba(42, 42, 46, 0.96);
  box-shadow: 0 2px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08);
  color: #e8e8e8;
}

.field {
  width: 200px;
  padding: 7px 10px;
  border: 1px solid rgba(0, 0, 0, 0.14);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  font-size: 13px;
  line-height: 1.35;
  outline: none;
  box-sizing: border-box;
}

@media (prefers-color-scheme: dark) {
  .field {
    border-color: rgba(255, 255, 255, 0.16);
  }
}

:host-context([data-theme='theme-dark']) .field {
  border-color: rgba(255, 255, 255, 0.16);
}

.field:focus {
  border-color: color-mix(in srgb, var(--accent-color, #0b74da) 42%, rgba(0, 0, 0, 0.2));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent-color, #0b74da) 35%, transparent);
}

@media (prefers-color-scheme: dark) {
  .field:focus {
    border-color: color-mix(in srgb, var(--accent-color, #0b74da) 50%, rgba(255, 255, 255, 0.22));
  }
}

:host-context([data-theme='theme-dark']) .field:focus {
  border-color: color-mix(in srgb, var(--accent-color, #0b74da) 50%, rgba(255, 255, 255, 0.22));
}

.field::placeholder {
  color: transparent;
}

.nav {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-left: 4px;
  margin-left: 2px;
  border-left: 1px solid rgba(0, 0, 0, 0.08);
}

@media (prefers-color-scheme: dark) {
  .nav {
    border-left-color: rgba(255, 255, 255, 0.12);
  }
}

:host-context([data-theme='theme-dark']) .nav {
  border-left-color: rgba(255, 255, 255, 0.12);
}

.icon-btn {
  position: relative;
  box-sizing: border-box;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  opacity: 0.72;
  cursor: pointer;
  flex-shrink: 0;
}

.icon-btn.prev,
.icon-btn.next,
.icon-btn.close-x {
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover:not(:disabled) {
  opacity: 1;
  background: rgba(0, 0, 0, 0.05);
}

@media (prefers-color-scheme: dark) {
  .icon-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
  }
}

:host-context([data-theme='theme-dark']) .icon-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
}

.icon-btn:disabled {
  opacity: 0.28;
  cursor: default;
}

.prev::after,
.next::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 22px;
  height: 22px;
  margin: 0;
  padding: 0;
  transform: translate(-50%, -50%);
  background-color: currentColor;
  -webkit-mask-image: ${chevronMaskUrl};
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-image: ${chevronMaskUrl};
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  pointer-events: none;
}

.next::after {
  transform: translate(-50%, -50%) scaleX(-1);
}

.close-x::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 18px;
  height: 18px;
  margin: 0;
  padding: 0;
  transform: translate(-50%, -50%);
  background-color: currentColor;
  -webkit-mask-image: ${closeIconMaskUrl};
  -webkit-mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-image: ${closeIconMaskUrl};
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
  pointer-events: none;
}
`
