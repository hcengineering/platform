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
  import type { Asset, IntlString } from '@anticrm/platform'
  import { translate } from '@anticrm/platform'
  import { createEventDispatcher } from 'svelte'
  import { Icon, Label } from '@anticrm/ui'

  // export let _class: Ref<Class<Space>>
  // export let spaceQuery: DocumentQuery<Space> | undefined
  export let placeholder: IntlString | undefined = undefined
  export let placeholderParam: any | undefined = undefined
  export let searchable: boolean = false
  export let value: Array<{id: number | string, icon: Asset, label: IntlString}>

  let search: string = ''

  let phTraslate: string = ''
  $: if (placeholder) translate(placeholder, placeholderParam ?? {}).then(res => { phTraslate = res })

  const dispatch = createEventDispatcher()
  // const query = createQuery()
  // $: query.query(_class, { ...(spaceQuery ?? {}), name: { $like: '%' + search + '%' } }, result => { objects = result })
  // afterUpdate(() => { dispatch('update', Date.now()) })
</script>

<div class="selectPopup">
  {#if searchable}
    <div class="header">
      <input type='text' bind:value={search} placeholder={phTraslate} on:input={(ev) => { }} on:change/>
    </div>
  {/if}
  <div class="scroll">
    <div class="box">
      {#each value.filter(el => el.label.toLowerCase().includes(search.toLowerCase())) as space}
        <button class="menu-item" on:click={() => { dispatch('close', space.id) }}>
          <div class="icon"><Icon icon={space.icon} size={'small'} /></div>
          <span class="label"><Label label={space.label} /></span>
        </button>
      {/each}
    </div>
  </div>
</div>
