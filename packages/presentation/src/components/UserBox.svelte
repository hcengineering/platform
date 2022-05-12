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
  import contact, { Contact, formatName } from '@anticrm/contact'
  import type { Class, Ref } from '@anticrm/core'
  import type { IntlString } from '@anticrm/platform'
  import { TooltipAlignment, ButtonKind, ButtonSize, getFocusManager } from '@anticrm/ui'
  import { Button, Label, showPopup, Tooltip } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import presentation from '..'
  import { getClient } from '../utils'
  import IconPerson from './icons/Person.svelte'
  import UserInfo from './UserInfo.svelte'
  import UsersPopup from './UsersPopup.svelte'

  export let _class: Ref<Class<Contact>>
  export let label: IntlString
  export let placeholder: IntlString = presentation.string.Search
  export let value: Ref<Contact> | null | undefined
  export let allowDeselect = false
  export let titleDeselect: IntlString | undefined = undefined
  export let readonly = false
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let labelDirection: TooltipAlignment | undefined = undefined
  export let focusIndex = -1

  const dispatch = createEventDispatcher()

  let selected: Contact | undefined
  let container: HTMLElement

  const client = getClient()

  async function updateSelected (value: Ref<Contact>) {
    selected = await client.findOne(_class, { _id: value })
  }

  $: if (value != null) updateSelected(value)

  function getName (obj: Contact): string {
    const isPerson = client.getHierarchy().isDerived(obj._class, contact.class.Person)
    return isPerson ? formatName(obj.name) : obj.name
  }
  const mgr = getFocusManager()
</script>

<div bind:this={container} class="min-w-0">
  <Tooltip {label} fill={width === '100%'} direction={labelDirection}>
    <Button
      {focusIndex}
      icon={size === 'x-large' && selected ? undefined : IconPerson}
      width={width ?? 'min-content'}
      {size}
      {kind}
      {justify}
      on:click={() => {
        if (!readonly) {
          showPopup(
            UsersPopup,
            { _class, allowDeselect, selected: value, titleDeselect, placeholder },
            container,
            (result) => {
              if (result === null) {
                value = null
                selected = undefined
                dispatch('change', null)
              } else if (result !== undefined && result._id !== value) {
                value = result._id
                dispatch('change', value)
              }
              mgr?.setFocusPos(focusIndex)
            }
          )
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
          <Label {label} />
        {/if}
      </span>
    </Button>
  </Tooltip>
</div>
