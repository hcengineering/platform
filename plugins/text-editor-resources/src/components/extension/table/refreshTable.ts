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
// See the License for the specific language governing permissions and
// limitations under the License.
//

import type { Client, Doc } from '@hcengineering/core'
import { getResource } from '@hcengineering/platform'
import view, { type BuildMarkdownTableMetadata } from '@hcengineering/view'
import type { TableMetadata } from './tableMetadata'

/**
 * Build markdown table string from documents and metadata
 * Uses the extension point function from view-resources via view plugin
 */
export async function buildMarkdownTableFromDocs (
  docs: Doc[],
  metadata: TableMetadata,
  client: Client
): Promise<string> {
  try {
    const buildFunction = await getResource(view.function.BuildMarkdownTableFromDocs)
    // Extract only the BuildMarkdownTableMetadata fields from TableMetadata
    const buildMetadata: BuildMarkdownTableMetadata = {
      cardClass: metadata.cardClass,
      viewletId: metadata.viewletId,
      config: metadata.config,
      query: metadata.query
    }
    return await buildFunction(docs, buildMetadata, client)
  } catch (error) {
    // Function not available (view-resources not loaded)
    console.warn('BuildMarkdownTableFromDocs function not available:', error)
    return ''
  }
}
