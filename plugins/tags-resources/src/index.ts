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

import { Resources } from '@hcengineering/platform'
import { TagElement as TagElementType } from '@hcengineering/tags'
import { eventToHTMLElement, showPopup } from '@hcengineering/ui'
import TagsCategoryBar from './components/CategoryBar.svelte'
import CategoryPresenter from './components/CategoryPresenter.svelte'
import EditTagElement from './components/EditTagElement.svelte'
import TagElementPresenter from './components/TagElementPresenter.svelte'
import TagReferencePresenter from './components/TagReferencePresenter.svelte'
import Tags from './components/Tags.svelte'
import TagsDropdownEditor from './components/TagsDropdownEditor.svelte'
import TagsEditor from './components/TagsEditor.svelte'
import TagsItemPresenter from './components/TagsItemPresenter.svelte'
import TagsPresenter from './components/TagsPresenter.svelte'
import TagsView from './components/TagsView.svelte'
import TagElementCountPresenter from './components/TagElementCountPresenter.svelte'
import TagsFilter from './components/TagsFilter.svelte'
import TagsAttributeEditor from './components/TagsAttributeEditor.svelte'
import TagsEditorPopup from './components/TagsEditorPopup.svelte'
import LabelsPresenter from './components/LabelsPresenter.svelte'
import CreateTagElement from './components/CreateTagElement.svelte'
import ObjectsTagsEditorPopup from './components/ObjectsTagsEditorPopup.svelte'
import TagElement from './components/TagElement.svelte'
import { ObjQueryType } from '@hcengineering/core'
import { getRefs } from './utils'
import { Filter } from '@hcengineering/view'
import WeightPopup from './components/WeightPopup.svelte'
import DraftTagsEditor from './components/DraftTagsEditor.svelte'
import TagsFilterPresenter from './components/TagsFilterPresenter.svelte'
import DocTagsEditor from './components/DocTagsEditor.svelte'

export { WeightPopup, TagElement }
export async function tagsInResult (filter: Filter, onUpdate: () => void): Promise<ObjQueryType<any>> {
  const result = await getRefs(filter, onUpdate)
  return { $in: result }
}

export async function tagsNinResult (filter: Filter, onUpdate: () => void): Promise<ObjQueryType<any>> {
  const result = await getRefs(filter, onUpdate)
  return { $nin: result }
}

export async function createTagElement (props: Record<string, any> = {}): Promise<void> {
  showPopup(CreateTagElement, props, 'top')
}

export default async (): Promise<Resources> => ({
  component: {
    Tags,
    TagReferencePresenter,
    TagElementPresenter,
    TagsPresenter,
    TagsView,
    TagsFilter,
    TagsEditor,
    TagsDropdownEditor,
    TagsItemPresenter,
    CategoryPresenter,
    TagsCategoryBar,
    TagElementCountPresenter,
    TagsAttributeEditor,
    TagsEditorPopup,
    LabelsPresenter,
    ObjectsTagsEditorPopup,
    TagsFilterPresenter,
    DraftTagsEditor,
    DocTagsEditor
  },
  actionImpl: {
    Open: (value: TagElementType, evt: MouseEvent) => {
      showPopup(EditTagElement, { value, keyTitle: '' }, eventToHTMLElement(evt))
    }
  },
  function: {
    FilterTagsInResult: tagsInResult,
    FilterTagsNinResult: tagsNinResult,
    CreateTagElement: createTagElement
  }
})
