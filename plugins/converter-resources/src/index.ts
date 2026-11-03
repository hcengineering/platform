//
// Copyright © 2026 TraceX SAS.
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

import { type Resources } from '@hcengineering/platform'
import {
  buildMarkdownTableFromMetadata as buildMarkdownTableFromMetadataImpl,
  buildMarkdownTableFromDocs as buildMarkdownTableFromDocsImpl,
  buildTableData as buildTableDataImpl
} from './markdown'
import { copyAsMarkdownTableAction } from './actionImpl'
import { resolveTableSnapshot } from './trackedTable'
import CopyAsMarkdownButton from './components/CopyAsMarkdownButton.svelte'

export * from './formatter'
export * from './model'
export * from './data'

export { buildMarkdownTableFromDocs, buildMarkdownTableFromMetadata, buildTableData } from './markdown'

export { isRelationshipTable, buildRelationshipTableMetadata } from './data'

export { isIntlString } from './formatter'
export { registerValueFormatterForClass, registerValueFormatter } from './formatter'

export { type TableConverter, MarkdownTableConverter } from './types'

export default async (): Promise<Resources> => ({
  function: {
    BuildMarkdownTableFromMetadata: buildMarkdownTableFromMetadataImpl,
    BuildMarkdownTableFromDocs: buildMarkdownTableFromDocsImpl,
    ResolveTableSnapshot: resolveTableSnapshot,
    BuildTableData: buildTableDataImpl
  },
  actionImpl: {
    CopyAsMarkdownTable: copyAsMarkdownTableAction
  },
  component: {
    CopyAsMarkdownButton
  }
})
