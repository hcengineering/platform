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
  import { Employee } from '@hcengineering/contact'
  import { Class, Ref, Space } from '@hcengineering/core'
  import { SpaceMultiBoxList } from '@hcengineering/presentation'
  import { Component, DropdownLabelsIntl } from '@hcengineering/ui'
  import attachment from '../plugin'
  import { dateFileBrowserFilters, fileTypeFileBrowserFilters } from '..'
  import contact from '@hcengineering/contact'

  export let requestedSpaceClasses: Ref<Class<Space>>[]
  export let spaceId: Ref<Space> | undefined
  export let selectedParticipants: Ref<Employee>[]
  export let selectedSpaces: Ref<Space>[]
  export let selectedDateId: string
  export let selectedFileTypeId: string
</script>

<div class="filterBlockContainer">
  <div class="simpleFilterButton">
    <Component
      is={contact.component.UserBoxList}
      props={{
        items: selectedParticipants,
        label: attachment.string.FileBrowserFilterFrom
      }}
      on:update={(evt) => {
        selectedParticipants = evt.detail
      }}
    />
  </div>
  <div class="simpleFilterButton">
    <SpaceMultiBoxList
      _classes={requestedSpaceClasses}
      label={attachment.string.FileBrowserFilterIn}
      selectedItems={spaceId ? [spaceId] : []}
      on:update={(evt) => {
        selectedSpaces = evt.detail
      }}
    />
  </div>
  <div class="simpleFilterButton">
    <DropdownLabelsIntl
      items={dateFileBrowserFilters}
      label={attachment.string.FileBrowserFilterDate}
      bind:selected={selectedDateId}
    />
  </div>
  <div class="simpleFilterButton">
    <DropdownLabelsIntl
      items={fileTypeFileBrowserFilters}
      label={attachment.string.FileBrowserFilterFileType}
      bind:selected={selectedFileTypeId}
    />
  </div>
</div>

<style lang="scss">
  .filterBlockContainer {
    display: flex;
    flex-flow: row wrap;
    margin-top: 10px;
    margin-bottom: 10px;
  }
  .simpleFilterButton {
    max-width: 12rem;
    margin: 0.125rem 0.5rem 0.125rem 0;
  }
</style>
