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

import { concatLink, type Client, type Doc, type Ref } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import { getCurrentResolvedLocation, locationToUrl } from '@hcengineering/ui'
import presentation from '@hcengineering/presentation'
import type { TableMetadata, Viewlet } from '@hcengineering/view'
import type { CopyAsMarkdownTableProps, CopyRelationshipTableAsMarkdownProps } from '../types'
import { loadViewletConfig } from '../model/viewletLoader'
import { modelToConfig } from '../model/tableModel'

/**
 * Build metadata object from props and documents
 * If viewlet is not provided, tries to find a default viewlet for the class
 */
export async function buildTableMetadata (
  props: CopyAsMarkdownTableProps,
  docs: Doc[],
  client?: Client
): Promise<TableMetadata> {
  let viewletId: Ref<Viewlet> | undefined = props.viewlet?._id
  if (viewletId === undefined && client !== undefined) {
    const { viewlet } = await loadViewletConfig(client, client.getHierarchy(), props.cardClass, undefined, props.config)
    viewletId = viewlet?._id
  }

  let originalUrl: string | undefined
  try {
    const currentLocation = getCurrentResolvedLocation()
    const relativeUrl = locationToUrl(currentLocation)
    const frontUrl =
      getMetadata(presentation.metadata.FrontUrl) ?? (typeof window !== 'undefined' ? window.location.origin : '')
    originalUrl = concatLink(frontUrl, relativeUrl)
  } catch (error) {
    console.warn('Failed to capture original URL for table metadata:', error)
  }

  return {
    version: '1.0',
    cardClass: props.cardClass,
    viewletId,
    config: props.config,
    query: props.query,
    documentIds: docs.map((d) => d._id),
    timestamp: Date.now(),
    originalUrl
  }
}

/**
 * Check if a table metadata represents a relationship table
 * Relationship tables have viewletId: undefined
 */
export function isRelationshipTable (metadata: TableMetadata): boolean {
  return metadata.viewletId === undefined
}

/**
 * Build metadata object for relationship tables
 */
export function buildRelationshipTableMetadata (
  props: CopyRelationshipTableAsMarkdownProps,
  docs: Doc[]
): TableMetadata {
  let originalUrl: string | undefined
  try {
    const currentLocation = getCurrentResolvedLocation()
    const relativeUrl = locationToUrl(currentLocation)
    const frontUrl =
      getMetadata(presentation.metadata.FrontUrl) ?? (typeof window !== 'undefined' ? window.location.origin : '')
    originalUrl = concatLink(frontUrl, relativeUrl)
  } catch (error) {
    console.warn('Failed to capture original URL for relationship table metadata:', error)
  }

  return {
    version: '1.0',
    cardClass: props.cardClass,
    viewletId: undefined,
    config: modelToConfig(props.model),
    query: props.query,
    documentIds: docs.map((d) => d._id),
    timestamp: Date.now(),
    originalUrl
  }
}
