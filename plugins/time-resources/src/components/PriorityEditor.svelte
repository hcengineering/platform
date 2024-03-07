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
  import { ButtonBaseKind, Dropdown, ListItem, themeStore } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { ToDoPriority } from '@hcengineering/time'
  import { translate } from '@hcengineering/platform'
  import { todoPriorities } from '../utils'
  import Priority from './icons/Priority.svelte'
  import time from '../plugin'

  export let value: ToDoPriority = ToDoPriority.NoPriority
  export let kind: ButtonBaseKind | undefined = 'secondary'
  export let onChange: (value: ToDoPriority) => void = () => {}

  const dispatch = createEventDispatcher()

  let items: ListItem[] = []

  async function fillItems (lang: string) {
    items = [
      {
        _id: ToDoPriority.NoPriority.toString(),
        label: await translate(time.string.NoPriority, {}, lang),
        icon: Priority,
        iconProps: {
          size: 'small',
          value: ToDoPriority.NoPriority
        }
      },
      {
        _id: ToDoPriority.Urgent.toString(),
        label: await translate(time.string.UrgentPriority, {}, lang),
        icon: Priority,
        iconProps: {
          size: 'small',
          value: ToDoPriority.Urgent
        }
      },
      {
        _id: ToDoPriority.High.toString(),
        label: await translate(time.string.HighPriority, {}, lang),
        icon: Priority,
        iconProps: {
          size: 'small',
          value: ToDoPriority.High
        }
      },
      {
        _id: ToDoPriority.Medium.toString(),
        label: await translate(time.string.MediumPriority, {}, lang),
        icon: Priority,
        iconProps: {
          size: 'small',
          value: ToDoPriority.Medium
        }
      },
      {
        _id: ToDoPriority.Low.toString(),
        label: await translate(time.string.LowPriority, {}, lang),
        icon: Priority,
        iconProps: {
          size: 'small',
          value: ToDoPriority.Low
        }
      }
    ]
  }

  $: fillItems($themeStore.language)
  $: selected = items.find((item) => item._id === value.toString())
  $: selectedLabel = selected ? todoPriorities[Number(selected?._id)].label : time.string.NoPriority

  $: icon = selected?._id === ToDoPriority.NoPriority.toString() ? time.icon.Flag : selected?.icon

  function handleSelected (val: string) {
    const priority = parseInt(val)
    if (priority !== value) {
      dispatch('change', priority)
      value = priority
      onChange(priority)
    }
  }
</script>

<Dropdown
  type={'type-button-icon'}
  size={'small'}
  {icon}
  {kind}
  {items}
  {selected}
  withSearch={false}
  tooltip={{ label: selectedLabel, direction: 'bottom' }}
  on:selected={(e) => {
    handleSelected(e.detail._id)
  }}
/>
