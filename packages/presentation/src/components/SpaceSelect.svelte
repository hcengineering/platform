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
  import SpacesPopup from './SpacesPopup.svelte'
  import Add from './icons/Add.svelte'
  import Close from './icons/Close.svelte'

  import type { Ref, Class, Space } from '@anticrm/core'

  export let _class: Ref<Class<Space>>
  export let title: IntlString
  export let caption: IntlString
  export let value: Ref<Space>
  export let show: boolean = false

  let selected: Space | undefined
  let btn: HTMLElement

  const client = getClient()

  async function updateSelected(value: Ref<Space>) {
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

<div class="flex-row-center">
  <button
    class="focused-button btn"
    class:selected={show}
    bind:this={btn}
    on:click|preventDefault={(ev) => {
      showPopup(SpacesPopup, { _class, title, caption }, ev.target, (result) => {
        if (result) {
          value = result._id
        }
      })
    }}
  >
    {#if selected}
      <Avatar size={'medium'} />
    {:else}
      <div class="icon">
        {#if show}<Close size={'small'} />{:else}<Add size={'small'} />{/if}
      </div>
    {/if}
  </button>

  <div class="selectUser">
    <div class="title"><Label label={title} /></div>
    <div class="caption-color">
      {#if selected}{selected.name}{:else}<Label label={'Not selected'} />{/if}
    </div>
  </div>
</div>

<style lang="scss">
  .btn {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    border: none;
  }

  .selectUser {
    margin-left: .75rem;
    .title {
      font-size: .75rem;
      font-weight: 500;
      color: var(--theme-content-accent-color);
    }
  }
</style>
