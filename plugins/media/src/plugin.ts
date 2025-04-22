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

import type { Plugin, Asset } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { type ComponentExtensionId } from '@hcengineering/ui'

/** @public */
export const mediaId = 'media' as Plugin

export const mediaPlugin = plugin(mediaId, {
  extension: {
    StateIndicator: '' as ComponentExtensionId,
    StateContext: '' as ComponentExtensionId
  },
  icon: {
    Mic: '' as Asset,
    MicEnabled: '' as Asset,
    MicDisabled: '' as Asset,
    Cam: '' as Asset,
    CamEnabled: '' as Asset,
    CamDisabled: '' as Asset
  },
  ids: {
    NoCam: '' as string
  }
})

export default mediaPlugin
