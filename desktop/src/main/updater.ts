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

import log from 'electron-log'
import { autoUpdater } from 'electron-updater'

autoUpdater.logger = log

autoUpdater.on('update-available', (info) => {
  log.info('Update available. ', info)
})
autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available.')
})
autoUpdater.on('error', (err: any) => {
  log.info('Error in auto-updater. ' + err)
})
autoUpdater.on('download-progress', (progressObj) => {
  let msg = 'Download speed: ' + progressObj.bytesPerSecond

  msg = msg + ' - Downloaded ' + progressObj.percent + '%'
  msg = msg + ' (' + progressObj.transferred + '/' + progressObj.total + ')'
  log.info(msg)
})

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded')
})

export default autoUpdater
