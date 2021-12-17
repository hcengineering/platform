<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

  import type { Ref, Class } from '@anticrm/core'
  import contact, { Contact, formatName } from '@anticrm/contact'
  import { createEventDispatcher } from 'svelte'
  import presentation from '..'

  export let _class: Ref<Class<Contact>>
  export let title: IntlString
  export let caption: IntlString
  export let value: Ref<Contact> | null | undefined
  export let show: boolean = false
  export let allowDeselect = false
  export let titleDeselect: IntlString | undefined = undefined

  const dispatch = createEventDispatcher()

  let selected: Contact | undefined
  let btn: HTMLElement
  let container: HTMLElement
  let opened: boolean = false

  const client = getClient()

  async function updateSelected (value: Ref<Contact>) {
    selected = await client.findOne(_class, { _id: value })
  }

  $: if (value != null) {
    updateSelected(value)
  }

  onMount(() => {
    if (btn && show) {
      btn.click()
      show = false
    }
  })

  function getName (obj: Contact): string {
    const isPerson = client.getHierarchy().isDerived(obj._class, contact.class.Person)
    return isPerson ? formatName(obj.name) : obj.name
  }
</script>

<div class="flex-row-center container" bind:this={container}
  on:click|preventDefault={() => {
    btn.focus()
    if (!opened) {
      opened = true
      showPopup(UsersPopup, { _class, title, caption, allowDeselect, selected: value, titleDeselect }, container, (result) => {
        if (result === undefined) {
          // Value is not changed.
          opened = false
          return
        }
        if (result != null) {
          value = result._id
          dispatch('change', value)
        } else {
          value = null
          selected = undefined
          dispatch('change', null)
        }
        opened = false
      })
    }
  }}
>
  <button class="focused-button btn" class:selected bind:this={btn}>
    <Avatar avatar={selected ? selected.avatar : undefined} size={'medium'} />
  </button>

  <div class="selectUser">
    <div class="title"><Label label={title} /></div>
    <div class:caption-color={selected} class:content-dark-color={!selected}>
      {#if selected}{getName(selected)}{:else}<Label label={presentation.string.NotSelected} />{/if}
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
