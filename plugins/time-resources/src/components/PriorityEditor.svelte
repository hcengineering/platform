<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import {
    ButtonBase,
    ButtonBaseKind,
    SelectPopup,
    SelectPopupValueType,
    eventToHTMLElement,
    showPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { ToDoPriority } from '@hcengineering/time'
  import { defaultToDoPriorities, todoPriorities } from '../utils'
  import Priority from './icons/Priority.svelte'
  import time from '../plugin'

  export let value: ToDoPriority = ToDoPriority.NoPriority
  export let kind: ButtonBaseKind = 'secondary'
  export let onChange: (value: ToDoPriority) => void = () => {}

  const dispatch = createEventDispatcher()

  let selectPopupPriorities: SelectPopupValueType[]
  $: selectPopupPriorities = defaultToDoPriorities.map((priority) => {
    return {
      id: priority,
      label: todoPriorities[priority].label,
      icon: Priority,
      iconProps: {
        value: priority
      },
      isSelected: value === priority
    }
  })
  $: selected = selectPopupPriorities.find((item) => item.id === value)
  $: selectedLabel = selected?.label === time.string.NoPriority ? time.string.SetPriority : selected?.label

  $: icon = selected?.id === ToDoPriority.NoPriority ? time.icon.Flag : selected?.icon
  $: iconProps = selected?.iconProps

  const handlePriorityUpdate = async (newPriority: ToDoPriority) => {
    if (newPriority == null || value === newPriority) {
      return
    }

    value = newPriority
    dispatch('change', newPriority)
    onChange(newPriority)
  }

  function handleClick (event: MouseEvent) {
    event.stopPropagation()

    showPopup(
      SelectPopup,
      {
        value: selectPopupPriorities,
        placeholder: time.string.SetPriority,
        searchable: true
      },
      eventToHTMLElement(event),
      handlePriorityUpdate
    )
  }
</script>

<ButtonBase
  id="priorityButton"
  type={'type-button-icon'}
  size={'small'}
  {kind}
  {icon}
  {iconProps}
  tooltip={{ label: selectedLabel, direction: 'bottom' }}
  on:click={handleClick}
/>
