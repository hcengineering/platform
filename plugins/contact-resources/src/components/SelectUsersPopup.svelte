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
  import { createEventDispatcher } from 'svelte'
  import presentation from '@hcengineering/presentation'
  import { deviceOptionsStore, EditWithIcon, IconSearch, Modal, Scroller } from '@hcengineering/ui'
  import { IntlString } from '@hcengineering/platform'
  import { Class, Ref } from '@hcengineering/core'
  import { ChannelProvider, Contact } from '@hcengineering/contact'

  import contact from '../plugin'
  import UsersList from './UsersList.svelte'

  export let _class: Ref<Class<Contact>> = contact.mixin.Employee
  export let searchField: string = 'name'
  export let searchMode: 'field' | 'fulltext' | 'disabled' = 'field'
  export let groupBy = '_class'
  export let okLabel: IntlString = presentation.string.Ok
  export let placeholder: IntlString = presentation.string.Search
  export let selected: Ref<Contact>[] = []
  export let skipCurrentAccount = false
  export let disableDeselectFor: Ref<Contact>[] = []
  export let showStatus = true
  export let skipInactive = false
  export let multiselect = true
  export let channelProviders: ChannelProvider[] = []
  export let skipWithoutChannels = false

  const dispatch = createEventDispatcher()

  let search: string = ''
  let selectedIds: Ref<Contact>[] = []

  $: selectedIds = selected

  function handleCancel (): void {
    dispatch('close')
  }

  function okAction (): void {
    dispatch('close', selectedIds)
  }

  function handleSelectionChanged (event: CustomEvent): void {
    selectedIds = event.detail ?? []
  }
</script>

<Modal
  label={contact.string.SelectUsers}
  type="type-popup"
  padding="0"
  {okLabel}
  {okAction}
  canSave={selectedIds.length > 0}
  onCancel={handleCancel}
  on:close
>
  <div class="hulyModal-content__titleGroup">
    <div class="search">
      <EditWithIcon
        icon={IconSearch}
        size="large"
        width="100%"
        autoFocus={!$deviceOptionsStore.isMobile}
        bind:value={search}
        on:change={() => dispatch('search', search)}
        on:input={() => dispatch('search', search)}
        {placeholder}
      />
    </div>

    <div class="line" />

    <slot />

    <div class="users">
      <Scroller padding="0.75rem 0">
        <UsersList
          {_class}
          {searchField}
          {searchMode}
          {search}
          {multiselect}
          {groupBy}
          selected={selectedIds}
          {showStatus}
          {disableDeselectFor}
          {skipCurrentAccount}
          {skipInactive}
          {channelProviders}
          {skipWithoutChannels}
          on:select={handleSelectionChanged}
        />
      </Scroller>
    </div>
  </div>
</Modal>

<style lang="scss">
  .line {
    width: 100%;
    height: 1px;
    background: var(--global-subtle-ui-BorderColor);
  }

  .search {
    padding: 1.25rem;
    padding-top: 0.25rem;
  }

  .users {
    display: flex;
    flex-direction: column;
    max-height: 32rem;
  }
</style>
