//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { Menu, NativeImage, nativeImage, Tray } from 'electron'
import { WindowAction } from '../ui/types'
import { Settings } from './settings'
import { getFileInPublicBundledFolder } from './path'
import { getBadgeIconInfo } from './trayUtils'
import path from 'path'

export class TrayController {
  private tray: Tray | undefined = undefined
  private readonly defaultIcon: NativeImage
  private readonly notificationIcon: NativeImage
  private badgeCount: number = 0

  constructor (
    private readonly settings: Settings,
    private readonly activateWindow: WindowAction,
    private readonly quitApplication: WindowAction) {
    this.defaultIcon = nativeImage.createFromPath(getFileInPublicBundledFolder('AppIcon.ico'))
    this.defaultIcon.setTemplateImage(true)

    this.notificationIcon = nativeImage.createFromPath(getFileInPublicBundledFolder('AppIconNotification.png'))
    this.notificationIcon.setTemplateImage(true)

    if (this.settings.isMinimizeToTrayEnabled()) {
      this.instantiateTray()
    }
  }

  public updateTrayBadge (count: number): void {
    const countChanged = this.badgeCount !== count
    this.badgeCount = count
    if (!countChanged) {
      return
    }

    this.evaluateIcon(count)
  }

  public setMinimizeToTrayEnabled (enabled: boolean): void {
    this.settings.setMinimizeToTrayEnabled(enabled)
    if (enabled) {
      if (this.tray == null) {
        this.instantiateTray()
      }
    } else {
      if (this.tray != null) {
        this.tray.destroy()
        this.tray = undefined
      }
    }
  }

  public toggleMinimizeToTray (): boolean {
    const currentSetting = this.settings.isMinimizeToTrayEnabled()
    const newSetting = !currentSetting
    this.setMinimizeToTrayEnabled(newSetting)
    return newSetting
  }

  private instantiateTray (): void {
    this.tray = createTray(
      () => { this.activateWindow() },
      () => { this.quitApplication() },
      this.defaultIcon
    )
    this.evaluateIcon(this.badgeCount)
  }

  private evaluateIcon (badgeCount: number): void {
    if (this.tray == null) {
      return
    }

    const iconInfo = getBadgeIconInfo(badgeCount, BASE_TITLE)
    if (badgeCount > 0) {
      const iconFilePath = getFileInPublicBundledFolder(path.join('app_icons_with_badge', iconInfo.fileName))
      const icon = nativeImage.createFromPath(iconFilePath)
      this.tray.setImage(icon)
    } else {
      this.tray.setImage(this.defaultIcon)
    }

    this.tray.setToolTip(iconInfo.tooltip)
  }
}

const BASE_TITLE = 'Huly'

function createTray (activateWindow: WindowAction, quitApplication: WindowAction, icon: NativeImage): Tray {
  const tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        activateWindow()
      }
    },
    {
      label: 'Exit',
      click: () => {
        quitApplication()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
  tray.setToolTip(BASE_TITLE)

  tray.on('double-click', () => {
    activateWindow()
  })

  tray.on('click', (): void => {
    activateWindow()
  })

  return tray
}
