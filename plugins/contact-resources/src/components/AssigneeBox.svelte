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
  import contact, { Contact, Employee, getName } from '@hcengineering/contact'
  import { Class, DocumentQuery, FindOptions, Hierarchy, Ref } from '@hcengineering/core'
  import { getEmbeddedLabel, IntlString } from '@hcengineering/platform'
  import {
    ActionIcon,
    Button,
    ButtonKind,
    ButtonSize,
    IconSize,
    getEventPositionElement,
    getFocusManager,
    Icon,
    Label,
    LabelAndProps,
    showPanel,
    showPopup,
    tooltip
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import presentation, { getClient } from '@hcengineering/presentation'
  import { PersonLabelTooltip, employeeByIdStore } from '..'
  import AssigneePopup from './AssigneePopup.svelte'
  import IconPerson from './icons/Person.svelte'
  import UserInfo from './UserInfo.svelte'
  import EmployeePresenter from './EmployeePresenter.svelte'

  export let _class: Ref<Class<Employee>> = contact.class.Employee
  export let excluded: Ref<Contact>[] | undefined = undefined
  export let options: FindOptions<Employee> | undefined = undefined
  export let docQuery: DocumentQuery<Employee> | undefined = {
    active: true
  }
  export let label: IntlString
  export let placeholder: IntlString = presentation.string.Search
  export let value: Ref<Employee> | null | undefined
  export let prevAssigned: Ref<Employee>[] | undefined = []
  export let componentLead: Ref<Employee> | undefined = undefined
  export let members: Ref<Employee>[] | undefined = []
  export let allowDeselect = true
  export let titleDeselect: IntlString | undefined = undefined
  export let readonly = false
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let avatarSize: IconSize = kind === 'regular' ? 'small' : 'card'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let focusIndex = -1
  export let showTooltip: LabelAndProps | PersonLabelTooltip | undefined = undefined
  export let showNavigate = true
  export let shouldShowName: boolean = true
  export let id: string | undefined = undefined
  export let short: boolean = false

  const icon = IconPerson

  const dispatch = createEventDispatcher()

  let selected: Employee | undefined
  let container: HTMLElement

  const client = getClient()

  async function updateSelected (value: Ref<Employee> | null | undefined) {
    selected = value ? $employeeByIdStore.get(value) ?? (await client.findOne(_class, { _id: value })) : undefined
  }

  $: updateSelected(value)

  const mgr = getFocusManager()

  const _click = (ev: MouseEvent): void => {
    if (!readonly) {
      ev.preventDefault()
      ev.stopPropagation()

      showPopup(
        AssigneePopup,
        {
          _class,
          options,
          docQuery,
          prevAssigned,
          componentLead,
          members,
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
<div {id} bind:this={container} class="min-w-0" class:w-full={width === '100%'} class:h-full={$$slots.content}>
  {#if $$slots.content}
    <div
      class="w-full h-full flex-streatch"
      on:click={_click}
      use:tooltip={selected !== undefined ? { label: getEmbeddedLabel(getName(selected)) } : undefined}
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
          use:tooltip={selected !== undefined ? { label: getEmbeddedLabel(getName(selected)) } : undefined}
        >
          {#if selected}
            {#if hideIcon || selected}
              <UserInfo value={selected} size={avatarSize} {icon} {short} on:accent-color />
            {:else}
              {getName(selected)}
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
                showPanel(view.component.EditDoc, selected._id, Hierarchy.mixinOrClass(selected), 'content')
              }
            }}
          />
        {/if}
      </span>
    </Button>
  {/if}
</div>
