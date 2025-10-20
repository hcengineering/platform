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

import { app } from 'electron'
import { TrayController } from './tray'
import { Settings } from './settings'

export class OsIntegration {
  constructor (
    private readonly settings: Settings,
    private readonly tray: TrayController) {
  }

  getTray (): TrayController {
    return this.tray
  }

  toggleAutoLaunch (): boolean {
    const settings = app.getLoginItemSettings()
    const previousValue = settings.openAtLogin
    const newValue = !previousValue
    settings.openAtLogin = newValue
    app.setLoginItemSettings(settings)
    this.settings.setAutoLaunchEnabled(newValue)
    return newValue
  }
}
