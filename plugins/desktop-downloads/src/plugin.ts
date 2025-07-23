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

import type { Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import { type DownloadItem } from './types'

/** @public */
export const desktopDownloadsId = 'desktop-downloads' as Plugin

/** @public */
export type DownloadItemHandler = (item: DownloadItem) => void

export const desktopDownloadsPlugin = plugin(desktopDownloadsId, {
  icon: {},
  function: {
    HandleDownloadItem: '' as Resource<DownloadItemHandler>
  }
})

export default desktopDownloadsPlugin
