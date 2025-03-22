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

import { Asset, IntlString, plugin, Plugin, Resource, Metadata } from '@hcengineering/platform'
import { type UploadHandler } from '@hcengineering/uploader'

/**
 * @public
 */
export const recorderId = 'recorder' as Plugin

/**
 * @public
 */
export type GetMediaStream = (options?: DisplayMediaStreamOptions) => Promise<MediaStream>

/**
 * @public
 */
const recordPlugin = plugin(recorderId, {
  icon: {
    Record: '' as Asset
  },
  metadata: {
    StreamUrl: '' as Metadata<string>,
    GetCustomMediaStream: '' as Metadata<GetMediaStream>
  },
  string: {
    Pause: '' as IntlString,
    Stop: '' as IntlString,
    Resume: '' as IntlString,
    Record: '' as IntlString,
    Cancel: '' as IntlString,
    ClickToSkip: '' as IntlString
  },
  function: {
    Record: '' as Resource<UploadHandler>
  }
})

export default recordPlugin
