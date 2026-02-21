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

import { type Resources } from '@hcengineering/platform'
import {
  copyAsMarkdownTableFromResource,
  copyRelationshipTableAsMarkdown,
  buildMarkdownTableFromMetadata as buildMarkdownTableFromMetadataImpl,
  buildMarkdownTableFromDocs as buildMarkdownTableFromDocsImpl
} from './markdown'
import { copyAsMarkdownTableAction } from './actionImpl'
import CopyAsMarkdownButton from './components/CopyAsMarkdownButton.svelte'

export * from './formatter'
export * from './model'
export * from './data'

export {
  copyAsMarkdownTable,
  copyAsMarkdownTableFromResource,
  copyRelationshipTableAsMarkdown,
  buildMarkdownTableFromDocs,
  buildMarkdownTableFromMetadata
} from './markdown'

export { isRelationshipTable, buildRelationshipTableMetadata } from './data'

export { isIntlString } from './formatter'
export { registerValueFormatterForClass, registerValueFormatter } from './formatter'

export { type TableConverter, MarkdownTableConverter } from './types'

export default async (): Promise<Resources> => ({
  function: {
    CopyAsMarkdownTable: copyAsMarkdownTableFromResource,
    CopyRelationshipAsMarkdown: copyRelationshipTableAsMarkdown,
    BuildMarkdownTableFromMetadata: buildMarkdownTableFromMetadataImpl,
    BuildMarkdownTableFromDocs: buildMarkdownTableFromDocsImpl
  },
  actionImpl: {
    CopyAsMarkdownTable: copyAsMarkdownTableAction
  },
  component: {
    CopyAsMarkdownButton
  }
})
