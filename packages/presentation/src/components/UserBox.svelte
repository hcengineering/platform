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
  import { onMount } from 'svelte'
  import type { IntlString } from '@anticrm/platform'
  import { getClient } from '../utils'

  import { Label, showPopup } from '@anticrm/ui'
  import Avatar from './Avatar.svelte'
  import UsersPopup from './UsersPopup.svelte'
  import IconAvatar from './icons/Avatar.svelte'

  import type { Ref, Class } from '@anticrm/core'
  import type { Person } from '@anticrm/contact'

  export let _class: Ref<Class<Person>>
  export let title: IntlString
  export let caption: IntlString
  export let value: Ref<Person>
  export let show: boolean = false

  let selected: Person | undefined
  let btn: HTMLElement
  let container: HTMLElement

  const client = getClient()

  async function updateSelected(value: Ref<Person>) {
    selected = await client.findOne(_class, { _id: value })
  }

  $: updateSelected(value)

  onMount(() => {
    if (btn && show) {
      btn.click()
      show = false
    }
  })
</script>

<div class="flex-row-center container" bind:this={container}
  on:click|preventDefault={() => {
    btn.focus()
    showPopup(UsersPopup, { _class, title, caption }, container, (result) => {
      if (result) {
        value = result._id
      }
    })
  }}
>
  <button class="focused-button btn" class:selected bind:this={btn}>
    {#if selected}
      <Avatar size={'medium'} />
    {:else}
      <IconAvatar />
    {/if}
  </button>

  <div class="selectUser">
    <div class="title"><Label label={title} /></div>
    <div class="caption-color">
      {#if selected}{selected.firstName + ' ' + selected.lastName}{:else}<Label label={'Not selected'} />{/if}
    </div>
  </div>
</div>

<style lang="scss">
  .container { cursor: pointer; }
  .btn {
    width: 2.25rem;
    height: 2.25rem;
    background-color: transparent;
    border: 1px solid var(--theme-card-divider);
    border-radius: 50%;
  }
  .selected { border: none; }

  .selectUser {
    margin-left: .75rem;
    .title {
      font-size: .75rem;
      font-weight: 500;
      color: var(--theme-content-accent-color);
    }
  }
</style>
