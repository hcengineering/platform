import { app, Menu, nativeImage, Tray } from 'electron'
import { WindowAction } from '../ui/types'
import { Settings } from './settings'
import path from 'path'
import { getFileInPublicBundledFolder } from './path'

export class TrayController {
  private tray: Tray | null = null

  constructor (
    private readonly settings: Settings,
    private readonly activateWindow: WindowAction,
    private readonly quitApplication: WindowAction) {
    if (this.settings.isMinimizeToTrayEnabled()) {
      this.instantiateTray()
    }
  }

  private instantiateTray (): void {
    this.tray = createTray(
      () => { this.activateWindow() },
      () => { this.quitApplication() }
    )
  }

  setMinimizeToTrayEnabled (enabled: boolean): void {
    this.settings.setMinimizeToTrayEnabled(enabled)
    if (enabled) {
      if (this.tray == null) {
        this.instantiateTray()
      }
    } else {
      if (this.tray != null) {
        this.tray.destroy()
        this.tray = null
      }
    }
  }

  toggleMinimizeToTray (): boolean {
    const currentSetting = this.settings.isMinimizeToTrayEnabled()
    const newSetting = !currentSetting
    this.setMinimizeToTrayEnabled(newSetting)
    return newSetting
  }
}

function createTray (activateWindow: WindowAction, quitApplication: WindowAction): Tray {
  const trayIcon = nativeImage.createFromPath(getFileInPublicBundledFolder('AppIcon.ico'))
  trayIcon.setTemplateImage(true)

  const tray = new Tray(trayIcon)

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
  tray.setToolTip('Huly')

  tray.on('double-click', () => {
    activateWindow()
  })

  tray.on('click', (): void => {
    activateWindow()
  })

  return tray
}
