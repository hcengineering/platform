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

import { Session, systemPreferences } from 'electron'
import log from 'electron-log'

export function addPermissionHandlers (session: Session): void {
  session.setPermissionRequestHandler((webContents, permission, result, details) => {
    log.info('permissions requested: ', permission, details)

    if (process.platform !== 'darwin') {
      result(true)
      return
    }

    if (permission === 'display-capture') {
      const granted = systemPreferences.getMediaAccessStatus('screen') === 'granted'
      result(granted)
      return
    }

    if (permission !== 'media') {
      result(true)
      return
    }

    const audioGranted = (details as any).mediaTypes?.includes('audio') === true ? askForMediaAccess('microphone') : Promise.resolve(true)
    const videoGranted = (details as any).mediaTypes?.includes('video') === true ? askForMediaAccess('camera') : Promise.resolve(true)

    Promise.all([audioGranted, videoGranted]).then(
      (res) => { result(res.every(r => r)) },
      () => { result(false) }
    )
  })

  session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    if (process.platform !== 'darwin') {
      return true
    }

    if (permission !== 'media') {
      return true
    }

    if (details.mediaType === 'audio') {
      return systemPreferences.getMediaAccessStatus('microphone') === 'granted'
    }

    if (details.mediaType === 'video') {
      return systemPreferences.getMediaAccessStatus('camera') === 'granted'
    }

    return false
  })
}

async function askForMediaAccess (type: 'microphone' | 'camera'): Promise<boolean> {
  try {
    if (process.platform !== 'darwin') {
      return true
    }

    const status = systemPreferences.getMediaAccessStatus(type)
    log.info(`Current ${type} access status:`, status)

    if (status === 'not-determined') {
      const success = await systemPreferences.askForMediaAccess(type)
      log.info(`Result of ${type} access:`, success ? 'granted' : 'denied')
      return success
    }

    return status === 'granted'
  } catch (error) {
    log.error(`Could not get ${type} permission:`, error.message)
  }

  return false
}
