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
  const lang = getCurrentLanguage()

  addNotification(
    await translate(plugin.string.ExportStarted, {}, lang),
    await translate(plugin.string.ExportStartedMessage, {}, lang),
    ExportNotification,
    undefined,
    NotificationSeverity.Info
  )

  try {
    const baseUrl = getMetadata(plugin.metadata.ExportUrl)
    const token = getMetadata(presentation.metadata.Token)
    if (token == null) {
      throw new Error('No token available')
    }

    const fieldMappers = {
      'documents:class:ControlledDocument': {
        author: '$currentUser',
        owner: '$currentUser',
        state: 'draft',
        major: 1,
        minor: 0,
        reviewers: [],
        controlledState: '',
        seqNumber: '$generateSeqNumber',
        code: '$generateCode'
      },
      'documents:class:DocumentMeta': {
        author: '$currentUser',
        owner: '$currentUser'
      }
    }

    const body: any = {
      targetWorkspace,
      _class,
      relations,
      fieldMappers
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
      let errorMessage = 'Unknown error occurred'
      try {
        const errorData = await res.json()
        errorMessage = errorData.message ?? errorData.error ?? `HTTP ${res.status}: ${res.statusText}`
      } catch {
        errorMessage = `HTTP ${res.status}: ${res.statusText}`
      }
      console.error('Export request failed:', errorMessage)
      await showFailureNotification(errorMessage)
      return
    }

    addNotification(
      await translate(plugin.string.ExportToWorkspaceCompleted, {}, lang),
      await translate(plugin.string.ExportToWorkspaceCompletedMessage, {}, lang),
      ExportNotification,
      undefined,
      NotificationSeverity.Success
    )
  } catch (err) {
    console.error('Export failed:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
    await showFailureNotification(errorMessage)
  }
}

async function showFailureNotification (errorDetails?: string): Promise<void> {
  const lang = getCurrentLanguage()
  const message =
    errorDetails !== undefined
      ? `${await translate(plugin.string.ExportFailed, {}, lang)}: ${errorDetails}`
      : await translate(plugin.string.ExportFailed, {}, lang)
  addNotification(
    await translate(plugin.string.ExportToWorkspaceFailed, {}, lang),
    message,
    ExportNotification,
    undefined,
    NotificationSeverity.Error
  )
}
