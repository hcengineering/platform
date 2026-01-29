//
// Copyright © 2026 Hardcore Engineering Inc.
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

import type { Doc } from '@hcengineering/core'
import { translate } from '@hcengineering/platform'
import { addNotification, NotificationSeverity } from '@hcengineering/ui'
import { getCurrentLanguage } from '@hcengineering/theme'
import view from '@hcengineering/view'
import { getClient } from '@hcengineering/presentation'
import { copyMarkdown, SimpleNotification } from '@hcengineering/view-resources'

import type { CopyAsMarkdownTableProps, CopyRelationshipTableAsMarkdownProps } from '../types'
import { buildTableMetadata, buildRelationshipTableMetadata } from '../data'
import { buildMarkdownTableFromDocs, buildRelationshipTableMarkdown } from './tableBuilder'

/**
 * Copy documents as markdown table to clipboard
 */
export async function copyAsMarkdownTable (
  doc: Doc | Doc[],
  evt: Event,
  props: CopyAsMarkdownTableProps
): Promise<void> {
  try {
    const docs = Array.isArray(doc) ? doc : doc !== undefined ? [doc] : []
    if (docs.length === 0) {
      return
    }
    const client = getClient()

    const markdown = await buildMarkdownTableFromDocs(docs, props, client)

    if (markdown.length === 0) {
      return
    }

    const metadata = await buildTableMetadata(props, docs, client)
    await copyMarkdown(markdown, metadata)

    const language = getCurrentLanguage()
    addNotification(
      await translate(view.string.Copied, {}, language),
      await translate(view.string.TableCopiedToClipboard, {}, language),
      SimpleNotification,
      undefined,
      NotificationSeverity.Success
    )
  } catch (error) {
    console.error('Error copying markdown table', error)
    const language = getCurrentLanguage()
    addNotification(
      await translate(view.string.Copied, {}, language),
      await translate(view.string.TableCopyFailed, {}, language),
      SimpleNotification,
      undefined,
      NotificationSeverity.Error
    )
  }
}

/**
 * Wrapper for the function resource (evt, props).
 * Callers must pass docs in props when using getResource(converter.function.CopyAsMarkdownTable).
 */
export async function copyAsMarkdownTableFromResource (
  evt: Event,
  props: CopyAsMarkdownTableProps & { docs?: Doc[] }
): Promise<void> {
  const docs = props.docs ?? []
  await copyAsMarkdownTable(docs, evt, props)
}

/**
 * Copy RelationshipTable as markdown table
 */
export async function copyRelationshipTableAsMarkdown (
  evt: Event,
  props: CopyRelationshipTableAsMarkdownProps
): Promise<void> {
  try {
    const client = getClient()
    const hierarchy = client.getHierarchy()
    const cardClass = hierarchy.getClass(props.cardClass)
    if (cardClass == null) {
      return
    }

    const language = getCurrentLanguage()
    const markdown = await buildRelationshipTableMarkdown(props, hierarchy, language)

    if (markdown.length === 0) {
      return
    }

    const metadata = buildRelationshipTableMetadata(props, props.objects)
    await copyMarkdown(markdown, metadata)

    addNotification(
      await translate(view.string.Copied, {}, language),
      await translate(view.string.TableCopiedToClipboard, {}, language),
      SimpleNotification,
      undefined,
      NotificationSeverity.Success
    )
  } catch (error) {
    console.error('Error copying relationship table', error)
    const language = getCurrentLanguage()
    addNotification(
      await translate(view.string.Copied, {}, language),
      await translate(view.string.TableCopyFailed, {}, language),
      SimpleNotification,
      undefined,
      NotificationSeverity.Error
    )
  }
}
