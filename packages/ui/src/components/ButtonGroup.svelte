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
  import { createEventDispatcher } from 'svelte'
  import type { ButtonItem } from '..'
  import Button from './Button.svelte'

  export let items: ButtonItem[]
  export let selected: string | boolean = false
  export let allowDeselected: boolean = true
  export let mode: 'filled-icon' | 'highlighted' | 'selected' = 'selected'
  export let props: any = {}

  const dispatch = createEventDispatcher()

  const select = (value: string | false): void => {
    selected = value
    dispatch('select', value)
  }
</script>

{#each items as item}
  {@const isSelect = selected === item.id}
  <Button
    {...item}
    id={`btnGID-${item.id}`}
    iconProps={mode === 'filled-icon' && isSelect ? { filled: true } : {}}
    selected={mode === 'selected' ? isSelect : false}
    highlight={mode === 'highlighted' ? isSelect : false}
    {...props}
    on:click={() => {
      if (!isSelect) select(item.id)
      else if (allowDeselected) select(false)
    }}
  />
{/each}
