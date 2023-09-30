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
  import contact, { Contact, getName } from '@hcengineering/contact'
  import { Class, Doc, DocumentQuery, FindOptions, Ref } from '@hcengineering/core'
  import { Asset, IntlString, getEmbeddedLabel } from '@hcengineering/platform'
  import presentation, { ObjectCreate, getClient } from '@hcengineering/presentation'
  import {
    ActionIcon,
    AnySvelteComponent,
    Button,
    ButtonKind,
    ButtonSize,
    Icon,
    IconSize,
    Label,
    LabelAndProps,
    getEventPositionElement,
    getFocusManager,
    showPopup,
    tooltip
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { openDoc } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import UserInfo from './UserInfo.svelte'
  import UsersPopup from './UsersPopup.svelte'
  import IconPerson from './icons/Person.svelte'

  export let _class: Ref<Class<Contact>>
  export let _previewClass: Ref<Class<Contact>> = contact.class.Contact
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
  export let avatarSize: IconSize = kind === 'link' ? 'x-small' : 'tiny'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let focusIndex = -1
  export let showTooltip: LabelAndProps | undefined = undefined
  export let showNavigate = true
  export let id: string | undefined = undefined
  export let filter: (it: Doc) => boolean = () => {
    return true
  }

  export let create: ObjectCreate | undefined = undefined

  const dispatch = createEventDispatcher()

  let selected: Contact | undefined
  let container: HTMLElement

  const client = getClient()

  async function updateSelected (value: Ref<Contact> | null | undefined) {
    selected = value ? await client.findOne(_previewClass, { _id: value }) : undefined
  }

  $: updateSelected(value)

  const mgr = getFocusManager()

  const _click = (ev: MouseEvent): void => {
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
          create,
          filter
        },
        !$$slots.content ? container : getEventPositionElement(ev),
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

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div {id} bind:this={container} class="min-w-0" class:w-full={width === '100%'} class:h-full={$$slots.content}>
  {#if $$slots.content}
    <div
      class="w-full h-full flex-streatch"
      on:click={_click}
      class:content-color={selected === undefined}
      use:tooltip={selected !== undefined
        ? { label: getEmbeddedLabel(getName(client.getHierarchy(), selected)) }
        : undefined}
    >
      <slot name="content" />
    </div>
  {:else}
    <Button
      {focusIndex}
      disabled={readonly}
      width={width ?? 'min-content'}
      {size}
      {kind}
      {justify}
      {showTooltip}
      on:click={_click}
    >
      <div
        slot="content"
        class="overflow-label flex-row-center"
        class:w-full={width === '100%'}
        class:flex-between={showNavigate && selected}
        class:content-color={value == null}
      >
        <div
          class="disabled"
          style:width={showNavigate && selected
            ? `calc(${width ?? 'min-content'} - 1.5rem)`
            : `${width ?? 'min-content'}`}
          use:tooltip={selected !== undefined
            ? { label: getEmbeddedLabel(getName(client.getHierarchy(), selected)) }
            : undefined}
        >
          {#if selected}
            {#if hideIcon || selected}
              <UserInfo value={selected} size={avatarSize} {icon} />
            {:else}
              {getName(client.getHierarchy(), selected)}
            {/if}
          {:else}
            <div class="flex-presenter not-selected">
              {#if icon}
                <div class="icon w-4" class:small-gap={size === 'inline' || size === 'small'}>
                  <Icon {icon} size={avatarSize} />
                </div>
              {/if}
              <div class="label no-underline">
                <Label {label} />
              </div>
            </div>
          {/if}
        </div>
        {#if selected && showNavigate}
          <div class="min-w-2" />
          <ActionIcon
            icon={view.icon.Open}
            size={'small'}
            action={() => {
              if (selected) {
                openDoc(client.getHierarchy(), selected)
              }
            }}
          />
        {/if}
      </div>
    </Button>
  {/if}
</div>
