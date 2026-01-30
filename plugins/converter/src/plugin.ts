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

import type { Client, Doc, Mixin, Ref } from '@hcengineering/core'
import { type Plugin, type Resource, plugin } from '@hcengineering/platform'
import type { Action, BuildMarkdownTableMetadata, ViewAction } from '@hcengineering/view'
import type {
  CopyAsMarkdownTableFunction,
  CopyRelationshipTableAsMarkdownFunction,
  MarkdownValueFormatter,
  CopyAsMarkdownTableProps
} from './types'

export const converterId = 'converter' as Plugin

export const converterPlugin = plugin(converterId, {
  mixin: {
    MarkdownValueFormatter: '' as Ref<Mixin<MarkdownValueFormatter>>
  },
  function: {
    CopyAsMarkdownTable: '' as Resource<CopyAsMarkdownTableFunction>,
    CopyRelationshipAsMarkdown: '' as Resource<CopyRelationshipTableAsMarkdownFunction>,
    BuildMarkdownTableFromMetadata: '' as Resource<
    (docs: Doc[], metadata: BuildMarkdownTableMetadata, client: Client) => Promise<string>
    >,
    BuildMarkdownTableFromDocs: '' as Resource<
    (docs: Doc[], props: CopyAsMarkdownTableProps, client: Client) => Promise<string>
    >
  },
  action: {
    CopyAsMarkdownTable: '' as Ref<Action<Doc, Record<string, any>>>
  },
  actionImpl: {
    CopyAsMarkdownTable: '' as ViewAction<CopyAsMarkdownTableProps>
  }
})

export default converterPlugin
