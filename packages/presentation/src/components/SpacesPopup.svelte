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
  import { translate } from '@anticrm/platform'
  import type { Ref, Class, Space, DocumentQuery } from '@anticrm/core'
  import { createQuery } from '../utils'
  import SpaceInfo from './SpaceInfo.svelte'
  import presentation from '..'

  export let _class: Ref<Class<Space>>
  export let spaceQuery: DocumentQuery<Space> | undefined

  let search: string = ''
  let objects: Space[] = []
  let phTraslate: string = ''
  $: translate(presentation.string.Search, {}).then(res => { phTraslate = res })

  const dispatch = createEventDispatcher()
  const query = createQuery()
  $: query.query(_class, { ...(spaceQuery ?? {}), name: { $like: '%' + search + '%' } }, result => { objects = result })
  afterUpdate(() => { dispatch('update', Date.now()) })
</script>

<div class="selectPopup">
  <div class="header">
    <input type='text' bind:value={search} placeholder={phTraslate} on:input={(ev) => { }} on:change/>
  </div>
  <div class="scroll">
    <div class="box">
      {#each objects as space}
        <button class="menu-item flex-between" on:click={() => { dispatch('close', space) }}>
          <SpaceInfo size={'large'} value={space} />
        </button>
      {/each}
    </div>
  </div>
</div>
