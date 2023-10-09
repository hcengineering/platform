<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import contact, { Contact, Employee, Person, getName } from '@hcengineering/contact'
  import { Class, DocumentQuery, FindOptions, Ref } from '@hcengineering/core'
  import { IntlString, getEmbeddedLabel } from '@hcengineering/platform'
  import presentation, { getClient } from '@hcengineering/presentation'
  import {
    ActionIcon,
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
  import { PersonLabelTooltip, personByIdStore } from '..'
  import AssigneePopup from './AssigneePopup.svelte'
  import EmployeePresenter from './EmployeePresenter.svelte'
  import UserInfo from './UserInfo.svelte'
  import IconPerson from './icons/Person.svelte'
  import { AssigneeCategory } from '../assignee'

  export let _class: Ref<Class<Employee>> = contact.mixin.Employee
  export let excluded: Ref<Contact>[] | undefined = undefined
  export let options: FindOptions<Employee> | undefined = undefined
  export let docQuery: DocumentQuery<Employee> | undefined = {
    active: true
  }
  export let label: IntlString
  export let placeholder: IntlString = presentation.string.Search
  export let value: Ref<Person> | null | undefined
  export let categories: AssigneeCategory[] | undefined = undefined
  export let allowDeselect = true
  export let titleDeselect: IntlString | undefined = undefined
  export let readonly = false
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let avatarSize: IconSize = kind === 'regular' ? 'small' : 'card'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let shrink: number = 0
  export let focusIndex = -1
  export let showTooltip: LabelAndProps | PersonLabelTooltip | undefined = undefined
  export let showNavigate = true
  export let shouldShowName: boolean = true
  export let id: string | undefined = undefined
  export let short: boolean = false

  const icon = IconPerson

  const dispatch = createEventDispatcher()

  let selected: Person | undefined
  let container: HTMLElement

  const client = getClient()

  async function updateSelected (value: Ref<Person> | null | undefined) {
    selected = value
      ? $personByIdStore.get(value) ?? (await client.findOne(contact.class.Person, { _id: value }))
      : undefined
  }

  $: updateSelected(value)

  const mgr = getFocusManager()

  function _click (ev: MouseEvent): void {
    if (!readonly) {
      ev.preventDefault()
      ev.stopPropagation()

      showPopup(
        AssigneePopup,
        {
          _class,
          options,
          docQuery,
          categories,
          ignoreUsers: excluded ?? [],
          icon,
          selected: value,
          placeholder,
          allowDeselect,
          titleDeselect
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
          if (result !== undefined) {
            mgr?.setFocusPos(focusIndex)
          }
        }
      )
    }
  }

  $: hideIcon = size === 'x-large' || (size === 'large' && kind !== 'link')
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  {id}
  bind:this={container}
  class="min-w-0"
  class:w-full={width === '100%'}
  class:h-full={$$slots.content}
  style:flex-shrink={shrink}
>
  {#if $$slots.content}
    <div
      class="w-full h-full flex-streatch"
      on:click={_click}
      use:tooltip={selected !== undefined
        ? { label: getEmbeddedLabel(getName(client.getHierarchy(), selected)) }
        : undefined}
    >
      <slot name="content" />
    </div>
  {:else if !shouldShowName}
    <EmployeePresenter
      value={selected}
      {avatarSize}
      tooltipLabels={showTooltip}
      shouldShowName={false}
      shouldShowPlaceholder
      onEmployeeEdit={_click}
    />
  {:else}
    <Button {focusIndex} width={width ?? 'min-content'} {size} {kind} {justify} {showTooltip} on:click={_click}>
      <span
        slot="content"
        class="overflow-label flex-grow"
        class:flex-between={showNavigate && selected}
        class:dark-color={value == null}
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
              <UserInfo value={selected} size={avatarSize} {icon} {short} on:accent-color />
            {:else}
              {getName(client.getHierarchy(), selected)}
            {/if}
          {:else}
            <div class="flex-presenter not-selected">
              {#if icon}
                <div class="icon w-4 flex-no-shrink" class:small-gap={size === 'inline' || size === 'small'}>
                  <Icon {icon} size={'small'} />
                </div>
              {/if}
              <div class="label no-underline">
                <Label {label} />
              </div>
            </div>
          {/if}
        </div>
        {#if selected && showNavigate}
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
      </span>
    </Button>
  {/if}
</div>
