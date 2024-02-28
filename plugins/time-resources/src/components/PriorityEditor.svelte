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
  import { translate } from '@hcengineering/platform'
  import { ButtonKind, Dropdown, ListItem, themeStore } from '@hcengineering/ui'
  import { ToDoPriority } from '@hcengineering/time'
  import { createEventDispatcher } from 'svelte'
  import time from '../plugin'

  export let value: ToDoPriority = ToDoPriority.NoPriority
  export let kind: ButtonKind | undefined = 'regular'
  export let onChange: (value: ToDoPriority) => void = () => {}

  let items: ListItem[] = []

  $: fill($themeStore.language)

  async function fill (lang: string) {
    items = [
      {
        _id: ToDoPriority.NoPriority.toString(),
        label: await translate(time.string.NoPriority, {}, lang),
        icon: time.icon.Flag
      },
      {
        _id: ToDoPriority.High.toString(),
        label: await translate(time.string.HighPriority, {}, lang),
        icon: time.icon.FilledFlag,
        iconProps: {
          fill: '#F96E50'
        }
      },
      {
        _id: ToDoPriority.Medium.toString(),
        label: await translate(time.string.MediumPriority, {}, lang),
        icon: time.icon.FilledFlag,
        iconProps: {
          fill: '#FFCD6B'
        }
      },
      {
        _id: ToDoPriority.Low.toString(),
        label: await translate(time.string.LowPriority, {}, lang),
        icon: time.icon.FilledFlag,
        iconProps: {
          fill: '#0084FF'
        }
      }
    ]
  }

  $: selected = items.find((item) => item._id === value.toString())

  const dispatch = createEventDispatcher()

  function change (val: string) {
    const priority = parseInt(val)
    if (priority !== value) {
      dispatch('change', priority)
      value = priority
      onChange(priority)
    }
  }
</script>

<Dropdown
  icon={time.icon.Flag}
  {kind}
  size={'medium'}
  placeholder={time.string.NoPriority}
  {items}
  {selected}
  withSearch={false}
  on:selected={(e) => {
    change(e.detail._id)
  }}
/>
