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

import { BrowserView, BrowserWindow, ipcMain, WebContents } from 'electron'
import { IpcMessage } from '../ui/ipcMessages'

let ipcHandlersRegistered = false

/** Overlay invoker webContents id → page webContents to run `findInPage` on. */
const findPageTargetByInvokerId = new Map<number, WebContents>()
/** Page webContents id → overlay that should receive `found-in-page` IPC. */
const findResultRecipientByPageId = new Map<number, WebContents>()
const pagesWithFoundInPageListener = new WeakSet<WebContents>()

const overlayViewsByWindowId = new Map<number, BrowserView>()
const overlayVisibleByWindowId = new Map<number, boolean>()

const OVERLAY_WIDTH = 432
const OVERLAY_HEIGHT = 64

function resolveFindTarget (sender: WebContents): WebContents {
  return findPageTargetByInvokerId.get(sender.id) ?? sender
}

function webContentsIfAlive (wc: WebContents): WebContents | null {
  return wc.isDestroyed() ? null : wc
}

export function registerFindInPageTarget (overlayWc: WebContents, pageWc: WebContents): void {
  findPageTargetByInvokerId.set(overlayWc.id, pageWc)
}

export function unregisterFindInPageTarget (overlayWc: WebContents): void {
  findPageTargetByInvokerId.delete(overlayWc.id)
}

export function unregisterFindInPageForwarding (pageWc: WebContents): void {
  findResultRecipientByPageId.delete(pageWc.id)
}

export function attachFindInPageResultForwarding (pageWc: WebContents, overlayWc: WebContents): void {
  findResultRecipientByPageId.set(pageWc.id, overlayWc)
  if (pagesWithFoundInPageListener.has(pageWc)) {
    return
  }
  pagesWithFoundInPageListener.add(pageWc)
  pageWc.on('found-in-page', (_event, result) => {
    const recipient = findResultRecipientByPageId.get(pageWc.id)
    if (recipient == null || recipient.isDestroyed()) {
      return
    }
    try {
      recipient.send(IpcMessage.FindInPageResult, result)
    } catch (err) {
      console.error('[find] forward found-in-page failed:', err)
    }
  })
}

function layoutFindOverlayBounds (win: BrowserWindow, view: BrowserView, visible: boolean): void {
  overlayVisibleByWindowId.set(win.id, visible)
  if (view.webContents.isDestroyed()) {
    return
  }
  if (!visible || win.isDestroyed()) {
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    return
  }
  const b = win.getContentBounds()
  view.setBounds({
    x: Math.max(0, b.width - OVERLAY_WIDTH - 12),
    y: 12,
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT
  })
}

export function registerFindOverlayView (win: BrowserWindow, view: BrowserView): void {
  overlayViewsByWindowId.set(win.id, view)
}

export function unregisterFindOverlayView (win: BrowserWindow): void {
  overlayViewsByWindowId.delete(win.id)
  overlayVisibleByWindowId.delete(win.id)
}

export function openFindInPageBar (win: BrowserWindow | undefined): void {
  if (win == null || win.isDestroyed()) {
    return
  }
  const view = overlayViewsByWindowId.get(win.id)
  if (view == null || view.webContents.isDestroyed()) {
    try {
      if (!win.webContents.isDestroyed()) {
        win.webContents.send(IpcMessage.OpenFindBar)
      }
    } catch (err) {
      console.error('[find] openFindBar fallback send failed:', err)
    }
    return
  }
  try {
    layoutFindOverlayBounds(win, view, true)
    view.webContents.send(IpcMessage.OpenFindBar)
  } catch (err) {
    console.error('[find] openFindBar overlay send failed:', err)
  }
}

export function attachResizeRelayoutFindOverlay (win: BrowserWindow): void {
  const onResize = (): void => {
    if (win.isDestroyed()) {
      return
    }
    if (overlayVisibleByWindowId.get(win.id) !== true) {
      return
    }
    const view = overlayViewsByWindowId.get(win.id)
    if (view == null || view.webContents.isDestroyed()) {
      return
    }
    layoutFindOverlayBounds(win, view, true)
  }
  win.on('resize', onResize)
}

export function registerFindInPageIpcHandlers (): void {
  if (ipcHandlersRegistered) {
    return
  }
  ipcHandlersRegistered = true

  ipcMain.handle(IpcMessage.FindInPage, async (event, text: string, options?: { forward?: boolean, findNext?: boolean, matchCase?: boolean, wordStart?: boolean, medialCapitalAsWordStart?: boolean }) => {
    try {
      const wc = webContentsIfAlive(resolveFindTarget(event.sender))
      if (wc == null) {
        return -1
      }
      if (text === '') {
        wc.stopFindInPage('clearSelection')
        return -1
      }
      return await Promise.resolve(wc.findInPage(text, options ?? {}))
    } catch (err) {
      console.error('[find] findInPage handler failed:', err)
      return -1
    }
  })

  ipcMain.handle(IpcMessage.StopFindInPage, async (event, action: 'clearSelection' | 'keepSelection' | 'activateSelection') => {
    try {
      const wc = webContentsIfAlive(resolveFindTarget(event.sender))
      if (wc == null) {
        return
      }
      wc.stopFindInPage(action)
    } catch (err) {
      console.error('[find] stopFindInPage handler failed:', err)
    }
  })

  ipcMain.on(IpcMessage.FindOverlayLayout, (event, visible: boolean) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (win == null || win.isDestroyed()) {
        return
      }
      const view = overlayViewsByWindowId.get(win.id)
      if (view == null || view.webContents.isDestroyed()) {
        return
      }
      layoutFindOverlayBounds(win, view, visible)
    } catch (err) {
      console.error('[find] FindOverlayLayout handler failed:', err)
    }
  })
}

export function attachFindShortcutToWebContents (wc: WebContents, openFindBar: () => void): void {
  wc.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') {
      return
    }
    const mod = input.control || input.meta
    if (!mod || input.alt) {
      return
    }
    const key = input.key.toLowerCase()
    if (key !== 'f' || input.shift) {
      return
    }
    event.preventDefault()
    openFindBar()
  })
}
