//
// Copyright © 2024 Hardcore Engineering Inc.
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

import Store from 'electron-store'
import { PackedConfig } from './config'

export class Settings {
  private static readonly SETTINGS_KEY_SERVER = 'server'
  private static readonly SETTINGS_KEY_MINIMIZE_TO_TRAY = 'minimize-to-tray'
  private static readonly SETTINGS_KEY_WINDOW_BOUNDS = 'windowBounds'

  private readonly store: Store
  private readonly isDev: boolean
  private readonly packedConfig?: PackedConfig

  constructor (store: Store, isDev: boolean, packedConfig?: PackedConfig) {
    this.store = store
    this.isDev = isDev
    this.packedConfig = packedConfig
  }

  readServerUrl (): string {
    if (this.isDev) {
      return process.env.FRONT_URL ?? 'http://huly.local:8087'
    }
    return (
      (this.store as any).get(Settings.SETTINGS_KEY_SERVER) as string ??
      this.packedConfig?.server ??
      process.env.FRONT_URL ??
      'https://huly.app'
    )
  }

  isMinimizeToTrayEnabled (): boolean {
    return (this.store as any).get(Settings.SETTINGS_KEY_MINIMIZE_TO_TRAY) as boolean ?? false
  }

  setMinimizeToTrayEnabled (enabled: boolean): void {
    (this.store as any).set(Settings.SETTINGS_KEY_MINIMIZE_TO_TRAY, enabled)
  }

  setServerUrl (serverUrl: string): void {
    (this.store as any).set(Settings.SETTINGS_KEY_SERVER, serverUrl)
  }

  getWindowBounds (): any {
    return (this.store as any).get(Settings.SETTINGS_KEY_WINDOW_BOUNDS)
  }

  setWindowBounds (bounds: any): void {
    (this.store as any).set(Settings.SETTINGS_KEY_WINDOW_BOUNDS, bounds)
  }
}
