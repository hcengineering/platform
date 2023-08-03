<!--
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
-->
<script lang="ts">
  import { Person } from '@hcengineering/contact'
  import { Class, Ref, Space } from '@hcengineering/core'
  import { SpaceMultiBoxList } from '@hcengineering/presentation'
  import { Component, DropdownLabelsIntl } from '@hcengineering/ui'
  import attachment from '../plugin'
  import { dateFileBrowserFilters, fileTypeFileBrowserFilters } from '..'
  import contact from '@hcengineering/contact'

  export let requestedSpaceClasses: Ref<Class<Space>>[]
  export let spaceId: Ref<Space> | undefined
  export let selectedParticipants: Ref<Person>[]
  export let selectedSpaces: Ref<Space>[]
  export let selectedDateId: string
  export let selectedFileTypeId: string
</script>

<div class="filterBlockContainer clear-mins gap-2">
  <Component
    is={contact.component.UserBoxList}
    props={{
      items: selectedParticipants,
      label: attachment.string.FileBrowserFilterFrom,
      kind: 'ghost',
      size: 'medium'
    }}
    on:update={(evt) => {
      selectedParticipants = evt.detail
    }}
  />
  <SpaceMultiBoxList
    _classes={requestedSpaceClasses}
    label={attachment.string.FileBrowserFilterIn}
    selectedItems={spaceId ? [spaceId] : []}
    kind={'ghost'}
    size={'medium'}
    on:update={(evt) => {
      selectedSpaces = evt.detail
    }}
  />
  <DropdownLabelsIntl
    items={dateFileBrowserFilters}
    label={attachment.string.FileBrowserFilterDate}
    bind:selected={selectedDateId}
    kind={'ghost'}
    size={'medium'}
  />
  <DropdownLabelsIntl
    items={fileTypeFileBrowserFilters}
    label={attachment.string.FileBrowserFilterFileType}
    bind:selected={selectedFileTypeId}
    kind={'ghost'}
    size={'medium'}
  />
</div>

<style lang="scss">
  .filterBlockContainer {
    display: flex;
    flex-flow: row wrap;
  }
</style>
