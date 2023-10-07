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

import { IntlString, mergeIds, Resource } from '@hcengineering/platform'
import tags, { tagsId } from '@hcengineering/tags'
import { AnyComponent } from '@hcengineering/ui'
import { FilterFunction } from '@hcengineering/view'

export default mergeIds(tagsId, tags, {
  component: {
    CategoryPresenter: '' as AnyComponent,
    TagElementCountPresenter: '' as AnyComponent
  },
  string: {
    NoTags: '' as IntlString,
    AddTag: '' as IntlString,
    EditTag: '' as IntlString,
    AddTagTooltip: '' as IntlString,
    AddNowTooltip: '' as IntlString,
    CancelLabel: '' as IntlString,
    SearchCreate: '' as IntlString,
    NoItems: '' as IntlString,
    TagDescriptionLabel: '' as IntlString,
    TagDescriptionPlaceholder: '' as IntlString,
    WeightPlaceholder: '' as IntlString,
    CategoryPlaceholder: '' as IntlString,
    TagTooltip: '' as IntlString,
    Tag: '' as IntlString,
    TagCreateLabel: '' as IntlString,
    TagName: '' as IntlString,
    SaveLabel: '' as IntlString,
    CategoryLabel: '' as IntlString,
    AllCategories: '' as IntlString,
    SelectAll: '' as IntlString,
    SelectNone: '' as IntlString,
    ApplyTags: '' as IntlString,

    Weight: '' as IntlString,
    Expert: '' as IntlString,
    Meaningfull: '' as IntlString,
    Initial: '' as IntlString,
    NumberLabels: '' as IntlString
  },
  function: {
    FilterTagsInResult: '' as FilterFunction,
    FilterTagsNinResult: '' as FilterFunction,
    CreateTagElement: '' as Resource<(props?: Record<string, any>) => Promise<void>>
  }
})
