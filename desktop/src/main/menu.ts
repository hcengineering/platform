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

import { Menu, MenuItemConstructorOptions, type BrowserWindow } from 'electron'

const isMac = process.platform === 'darwin'

export const addMenus = (getWindow: () => BrowserWindow, sendCommand: (cmd: string, ...args: any[]) => void): void => {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          accelerator: 'Meta+,',
          click: () => { sendCommand('open-settings') }
        },
        {
          label: 'Select workspace',
          click: () => { sendCommand('select-workspace') }
        },
        {
          label: 'Backup...',
          click: () => { sendCommand('start-backup') }
        },
        {
          label: 'Logout',
          click: () => { sendCommand('logout') }
        },
        { role: isMac ? 'close' : 'quit' }
      ]
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ]
  if (isMac) {
    template.unshift({ role: 'appMenu' })
  }
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
