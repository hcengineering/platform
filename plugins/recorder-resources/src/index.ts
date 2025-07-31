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

import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
import { translate, type Resources } from '@hcengineering/platform'
import { getCurrentLanguage } from '@hcengineering/theme'
import { type FileUploadOptions } from '@hcengineering/uploader'
import { addNotification, NotificationSeverity } from '@hcengineering/ui'
import view from '@hcengineering/view'

import { record } from './recording'
import RecorderExt from './components/RecorderExt.svelte'
import WorkbenchExtension from './components/WorkbenchExtension.svelte'

export { ScreenRecorder } from './screen-recorder'

async function uploadHandler ({ onFileUploaded, target }: FileUploadOptions): Promise<void> {
  if (!hasAccountRole(getCurrentAccount(), AccountRole.Guest)) {
    addNotification(
      await translate(view.string.ReadOnlyWarningTitle, {}, getCurrentLanguage()),
      await translate(view.string.ReadOnlyWarningMessage, {}, getCurrentLanguage()),
      view.component.ReadOnlyNotification,
      undefined,
      NotificationSeverity.Info,
      'readOnlyNotification'
    )
    return
  }

  await record({ onFileUploaded, target })
}

export default async (): Promise<Resources> => ({
  component: {
    RecorderExt,
    WorkbenchExtension
  },
  function: {
    Record: uploadHandler
  }
})
