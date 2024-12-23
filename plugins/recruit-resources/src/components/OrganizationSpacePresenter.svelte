<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
-->
<script lang="ts">
  import { Action, SearchEdit } from '@hcengineering/ui'
  import { FoldersBrowser, TreeNode } from '@hcengineering/view-resources'

  import { SpacesNavModel } from '@hcengineering/workbench'
  import { Doc, DocumentQuery } from '@hcengineering/core'
  import contact from '@hcengineering/contact'

  import recruit from '../plugin'

  export let model: SpacesNavModel
  export let actions: () => Promise<Action[]> = async () => []
  export let visible: boolean

  let search = ''
  let searchQuery: DocumentQuery<Doc> | undefined = undefined
  $: searchQuery = search !== '' ? { $search: search } : undefined
</script>

<TreeNode _id={'tree-' + model.id} label={model.label} {actions} highlighted={visible} isFold={false} {visible}>
  <div class="pl-3 pr-3 pt-1">
    <SearchEdit bind:value={search} width="auto" kind={'secondary'} />
  </div>
  <FoldersBrowser
    _class={recruit.mixin.VacancyList}
    storeId="organizations"
    titleKey="name"
    parentKey="space"
    plainList={true}
    allObjectsLabel={recruit.string.Organizations}
    allObjectsIcon={contact.icon.Company}
    getFolderLink={recruit.function.GetApplicantsLink}
    filterKey="company"
    noParentId={recruit.ids.AllCompanies}
    syncWithLocationQuery={true}
    query={searchQuery ?? {}}
  />
</TreeNode>
