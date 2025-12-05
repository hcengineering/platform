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
import { type Class, type Doc, type DocumentQuery, type Ref } from '@hcengineering/core'
import presentation from '@hcengineering/presentation'
import { addNotification, NotificationSeverity } from '@hcengineering/ui'
import { getMetadata, translate } from '@hcengineering/platform'
import { type RelationDefinition } from '@hcengineering/export'
import { getCurrentLanguage } from '@hcengineering/theme'
import ExportNotification from './components/ExportNotification.svelte'
import plugin from './plugin'

export async function exportToWorkspace (
  _class: Ref<Class<Doc>>,
  query: DocumentQuery<Doc> | undefined,
  selectedDocs: Doc[],
  targetWorkspace: string | undefined,
  relations: RelationDefinition[] | undefined
): Promise<void> {
  try {
    const baseUrl = getMetadata(plugin.metadata.ExportUrl)
    const token = getMetadata(presentation.metadata.Token)
    if (token == null) {
      throw new Error('No token available')
    }

    const body: any = {
      targetWorkspace,
      _class,
      relations,
      objectId: selectedDocs[0]?._id,
      objectSpace: selectedDocs[0]?.space
    }

    body.query =
      selectedDocs.length > 0
        ? {
            _id: { $in: selectedDocs.map((d) => d._id) }
          }
        : query

    const res = await fetch(`${baseUrl}/export-to-workspace`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      void res.json().catch(() => ({}))
      await showFailureNotification()
      return
    }

    const lang = getCurrentLanguage()
    addNotification(
      await translate(plugin.string.ExportStarted, {}, lang),
      await translate(plugin.string.ExportStartedMessage, {}, lang),
      ExportNotification,
      undefined,
      NotificationSeverity.Success
    )
  } catch (err) {
    console.error('Export failed:', err)
    await showFailureNotification()
  }
}

async function showFailureNotification (): Promise<void> {
  const lang = getCurrentLanguage()
  addNotification(
    await translate(plugin.string.ExportRequestFailed, {}, lang),
    await translate(plugin.string.ExportRequestFailedMessage, {}, lang),
    ExportNotification,
    undefined,
    NotificationSeverity.Error
  )
}
