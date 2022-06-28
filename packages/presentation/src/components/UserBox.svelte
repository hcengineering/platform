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
  import type { Class, DocumentQuery, FindOptions, Ref } from '@anticrm/core'
  import type { Asset, IntlString } from '@anticrm/platform'
  import {
    AnySvelteComponent,
    Button,
    ButtonKind,
    ButtonSize,
    getFocusManager,
    Label,
    showPopup,
    LabelAndProps
  } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import presentation from '..'
  import { ObjectCreate } from '../types'
  import { getClient } from '../utils'
  import IconPerson from './icons/Person.svelte'
  import UserInfo from './UserInfo.svelte'
  import UsersPopup from './UsersPopup.svelte'

  export let _class: Ref<Class<Contact>>
  export let excluded: Ref<Contact>[] | undefined = undefined
  export let options: FindOptions<Contact> | undefined = undefined
  export let docQuery: DocumentQuery<Contact> | undefined = undefined
  export let label: IntlString
  export let icon: Asset | AnySvelteComponent | undefined = IconPerson
  export let placeholder: IntlString = presentation.string.Search
  export let value: Ref<Contact> | null | undefined
  export let allowDeselect = false
  export let titleDeselect: IntlString | undefined = undefined
  export let readonly = false
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let focusIndex = -1
  export let showTooltip: LabelAndProps | undefined = undefined

  export let create: ObjectCreate | undefined = undefined

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

  const _click = (): void => {
    if (!readonly) {
      showPopup(
        UsersPopup,
        {
          _class,
          options,
          docQuery,
          ignoreUsers: excluded ?? [],
          icon,
          allowDeselect,
          selected: value,
          titleDeselect,
          placeholder,
          create
        },
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
  }

  $: hideIcon = size === 'x-large' || (size === 'large' && kind !== 'link')
</script>

<div bind:this={container} class="min-w-0" class:w-full={width === '100%'}>
  <Button
    {focusIndex}
    icon={hideIcon && selected ? undefined : icon}
    width={width ?? 'min-content'}
    {size}
    {kind}
    {justify}
    {showTooltip}
    on:click={_click}
  >
    <span slot="content" class="overflow-label disabled">
      {#if selected}
        {#if hideIcon}
          <UserInfo value={selected} size={kind === 'link' ? 'x-small' : 'medium'} {icon} />
        {:else}
          {getName(selected)}
        {/if}
      {:else}
        <Label {label} />
      {/if}
    </span>
  </Button>
</div>
