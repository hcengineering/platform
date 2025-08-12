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

import { type Resources } from '@hcengineering/platform'

import MediaExt from './components/MediaExt.svelte'
import WorkbenchExtension from './components/WorkbenchExtension.svelte'
import MediaPopupCamSelector from './components/MediaPopupCamSelector.svelte'
import MediaPopupMicSelector from './components/MediaPopupMicSelector.svelte'
import MediaPopupSpkSelector from './components/MediaPopupSpkSelector.svelte'

export * from './stores'
export * from './utils'

export default async (): Promise<Resources> => ({
  component: {
    MediaExt,
    MediaPopupCamSelector,
    MediaPopupMicSelector,
    MediaPopupSpkSelector,
    WorkbenchExtension
  }
})
