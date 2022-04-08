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
  import { Label, showPopup, Button, Tooltip } from '@anticrm/ui'
  import type { TooltipAligment } from '@anticrm/ui'
  import Avatar from './Avatar.svelte'
  import UsersPopup from './UsersPopup.svelte'
  import UserInfo from './UserInfo.svelte'
  import IconPerson from './icons/Person.svelte'

  import type { Ref, Class } from '@anticrm/core'
  import contact, { Contact, formatName } from '@anticrm/contact'
  import { createEventDispatcher } from 'svelte'
  import presentation from '..'

  export let _class: Ref<Class<Contact>>
  export let label: IntlString
  export let placeholder: IntlString = presentation.string.Search
  export let value: Ref<Contact> | null | undefined
  export let show: boolean = false
  export let allowDeselect = false
  export let titleDeselect: IntlString | undefined = undefined
  export let readonly = false
  export let kind: 'primary' | 'secondary' | 'no-border' | 'transparent' | 'link' | 'dangerous' = 'no-border'
  export let size: 'small' | 'medium' | 'large' | 'x-large' = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let labelDirection: TooltipAligment | undefined = undefined

  const dispatch = createEventDispatcher()

  let selected: Contact | undefined
  let container: HTMLElement
  let opened: boolean = false

  const client = getClient()

  async function updateSelected (value: Ref<Contact>) {
    selected = await client.findOne(_class, { _id: value })
  }

  $: if (value != null) updateSelected(value)

  function getName (obj: Contact): string {
    const isPerson = client.getHierarchy().isDerived(obj._class, contact.class.Person)
    return isPerson ? formatName(obj.name) : obj.name
  }
</script>

<div bind:this={container} class="min-w-0">
  <Tooltip label={label} fill={width === '100%'} direction={labelDirection}>
    <Button
      icon={(size === 'x-large' && selected) ? undefined : IconPerson}
      width={width ?? 'min-content'}
      {size} {kind} {justify}
      on:click={(ev) => {
        if (!opened && !readonly) {
          opened = true
          showPopup(UsersPopup, { _class, allowDeselect, selected: value, titleDeselect, placeholder }, container, (result) => {
            if (result === null) {
              value = null
              selected = undefined
              dispatch('change', null)
            } else if (result !== undefined && result._id !== value) {
              value = result._id
              dispatch('change', value)
            }
            opened = false
          })
        }
      }}
    >
      <span slot="content" style="overflow: hidden">
        {#if selected}
          {#if size === 'x-large'}
            <UserInfo value={selected} size={'medium'} />
          {:else}
            {getName(selected)}
          {/if}
        {:else}
          <Label label={label} />
        {/if}
      </span>
    </Button>
  </Tooltip>
</div>
