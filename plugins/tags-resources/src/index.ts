// Copyright © 2022 Hardcore Engineering Inc.
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

import { Doc, TxOperations } from '@anticrm/core'
import { Resources } from '@anticrm/platform'
import { TagElement } from '@anticrm/tags'
import TagElementPresenter from './components/TagElementPresenter.svelte'
import TagReferencePresenter from './components/TagReferencePresenter.svelte'
import Tags from './components/Tags.svelte'
import TagsPresenter from './components/TagsPresenter.svelte'
import TagsItemPresenter from './components/TagsItemPresenter.svelte'
import TagsView from './components/TagsView.svelte'
import TagsEditor from './components/TagsEditor.svelte'
import tags from './plugin'

async function DeleteTagElement (doc: TagElement, client: TxOperations): Promise<Doc[]> {
  return await client.findAll(tags.class.TagReference, { tag: doc._id })
}

export default async (): Promise<Resources> => ({
  component: {
    Tags,
    TagReferencePresenter,
    TagElementPresenter,
    TagsPresenter,
    TagsView,
    TagsEditor,
    TagsItemPresenter
  },
  dd: {
    DeleteTagElement
  }
})
