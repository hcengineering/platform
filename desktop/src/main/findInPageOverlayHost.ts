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

import { BrowserView, BrowserWindow } from 'electron'
import path from 'path'
import {
  attachFindInPageResultForwarding,
  attachFindShortcutToWebContents,
  attachResizeRelayoutFindOverlay,
  openFindInPageBar,
  registerFindInPageTarget,
  registerFindOverlayView,
  unregisterFindInPageForwarding,
  unregisterFindInPageTarget,
  unregisterFindOverlayView
} from './findInPage'
import { getBundledUiDistPath } from './path'

function destroyBrowserViewSafe (view: BrowserView): void {
  try {
    if (view.webContents.isDestroyed()) {
      return
    }
    const destroy = (view.webContents as { destroy?: () => void }).destroy
    destroy?.()
  } catch {
    /* ignore */
  }
}

/**
 * Hosts the find UI in a separate BrowserView so `webContents.findInPage` on the
 * main page does not match the query typed in the find field.
 *
 * If the overlay cannot be loaded, the window still works: Cmd/Ctrl+F becomes a
 * no-op for the overlay (main page may still receive `OpenFindBar` if anything listens).
 */
export async function setupFindInPageOverlayForWindow (win: BrowserWindow, sessionPartition: string, preloadScriptPath: string): Promise<void> {
  const pageWc = win.webContents
  const overlayHtmlPath = path.join(getBundledUiDistPath(), 'find-in-page-overlay.html')

  const view = new BrowserView({
    webPreferences: {
      devTools: true,
      sandbox: false,
      nodeIntegration: true,
      partition: sessionPartition,
      preload: preloadScriptPath
    }
  })

  const openFind = (): void => {
    openFindInPageBar(win)
  }

  try {
    await view.webContents.loadFile(overlayHtmlPath)
  } catch (err) {
    console.error('[find] Overlay failed to load; find bar disabled for this window:', overlayHtmlPath, err)
    destroyBrowserViewSafe(view)
    attachFindShortcutToWebContents(pageWc, openFind)
    return
  }

  if (win.isDestroyed() || pageWc.isDestroyed()) {
    destroyBrowserViewSafe(view)
    return
  }

  try {
    win.addBrowserView(view)
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    registerFindOverlayView(win, view)
    attachResizeRelayoutFindOverlay(win)
    registerFindInPageTarget(view.webContents, pageWc)
    attachFindInPageResultForwarding(pageWc, view.webContents)
    attachFindShortcutToWebContents(pageWc, openFind)
    attachFindShortcutToWebContents(view.webContents, openFind)

    win.on('close', () => {
      unregisterFindOverlayView(win)
      if (!view.webContents.isDestroyed()) {
        unregisterFindInPageTarget(view.webContents)
      }
      unregisterFindInPageForwarding(pageWc)
    })
  } catch (err) {
    console.error('[find] Overlay registration failed; find bar disabled for this window:', err)
    try {
      win.removeBrowserView(view)
    } catch {
      /* ignore */
    }
    unregisterFindOverlayView(win)
    destroyBrowserViewSafe(view)
    attachFindShortcutToWebContents(pageWc, openFind)
  }
}
