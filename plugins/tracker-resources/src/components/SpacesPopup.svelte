<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { afterUpdate, createEventDispatcher } from 'svelte'

  import ui, { Label, EditWithIcon, IconSearch, deviceOptionsStore } from '@hcengineering/ui'
  import SpaceInfo from './SpaceInfo.svelte'

  import type { Ref, Class, Space, DocumentQuery } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'

  export let _class: Ref<Class<Space>>
  export let spaceQuery: DocumentQuery<Space> | undefined

  let search: string = ''
  let objects: Space[] = []

  const dispatch = createEventDispatcher()
  const query = createQuery()
  $: query.query(_class, { ...(spaceQuery ?? {}), name: { $like: '%' + search + '%' } }, (result) => {
    objects = result
  })
  afterUpdate(() => {
    dispatch('update', Date.now())
  })
</script>

<div class="antiPopup antiPopup-withHeader">
  <div class="ap-space" />
  <div class="ap-header">
    <EditWithIcon
      icon={IconSearch}
      bind:value={search}
      placeholder={ui.string.SearchDots}
      autoFocus={!$deviceOptionsStore.isMobile}
    />
    <div class="ap-caption"><Label label={ui.string.Suggested} /></div>
  </div>
  <div class="ap-space" />
  <div class="ap-scroll">
    <div class="ap-box">
      {#each objects as space}
        <button
          class="ap-menuItem"
          on:click={() => {
            dispatch('close', space)
          }}
        >
          <SpaceInfo size={'large'} value={space} />
        </button>
      {/each}
    </div>
  </div>
  <div class="ap-space" />
</div>
