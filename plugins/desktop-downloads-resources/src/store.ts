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

import { type DownloadItem } from '@hcengineering/desktop-downloads'
import { derived, writable } from 'svelte/store'

const downloadsByKey = writable(new Map<string, DownloadItem>())

/** @public */
export const downloads = derived(downloadsByKey, ($downloadsByKey) => Array.from($downloadsByKey.values()))

/** @public */
export const progress = derived(downloads, ($downloads) => {
  const items = $downloads
    .filter((p) => p.state === 'progressing' || p.state === 'paused')
    .filter((p) => p.totalBytes > 0 && p.receivedBytes < p.totalBytes)

  const totalReceivedBytes = items.reduce((sum, item) => sum + item.receivedBytes, 0)
  const totalBytes = items.reduce((sum, item) => sum + item.totalBytes, 0)

  if (totalBytes === 0) {
    return 0
  }

  const percentage = (totalReceivedBytes / totalBytes) * 100
  return Math.min(100, Math.max(0, percentage))
})

/** @public */
export function updateDownloadItem (item: DownloadItem): void {
  downloadsByKey.update((m) => {
    return m.set(item.key, item)
  })
}

/** @public */
export function removeDownloadItem (item: DownloadItem): void {
  downloadsByKey.update((m) => {
    m.delete(item.key)
    return m
  })
}
