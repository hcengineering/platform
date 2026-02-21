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

import type { Client, Doc, Ref } from '@hcengineering/core'
import exportPlugin, { type ExportResultRecord } from '@hcengineering/export'
import { type Resources, translate } from '@hcengineering/platform'
import { themeStore } from '@hcengineering/ui'
import { get } from 'svelte/store'
import ExportButton from './components/ExportButton.svelte'
import ExportSettings from './components/ExportSettings.svelte'
import ExportToWorkspaceModal from './components/ExportToWorkspaceModal.svelte'
import ExportResultPanel from './components/ExportResultPanel.svelte'

export { default as ExportButton } from './components/ExportButton.svelte'
export { default as ExportSettings } from './components/ExportSettings.svelte'
export { default as ExportToWorkspaceModal } from './components/ExportToWorkspaceModal.svelte'
export { default as ExportResultPanel } from './components/ExportResultPanel.svelte'

export async function getExportResultTitle (_client: Client, _ref: Ref<Doc>, doc?: Doc): Promise<string> {
  const record = doc as ExportResultRecord | undefined
  if (record === undefined) return ''
  if (record.title !== undefined && record.title !== '') return record.title
  const lang = get(themeStore).language
  const createdOn = record.createdOn ?? Date.now()
  const dateStr = new Date(createdOn).toLocaleDateString(lang, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  return await translate(
    exportPlugin.string.ExportResultRecordTitle,
    {
      workspace: record.sourceWorkspace,
      date: dateStr
    },
    lang
  )
}

export default async (): Promise<Resources> => ({
  component: {
    ExportButton,
    ExportSettings,
    ExportToWorkspaceModal,
    ExportResultPanel
  },
  function: {
    ExportResultTitleProvider: getExportResultTitle
  }
})
