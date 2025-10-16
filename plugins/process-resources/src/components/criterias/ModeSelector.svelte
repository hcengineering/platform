<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { DropdownLabelsIntl } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { Mode } from '../../query'

  export let selectedMode: Mode
  export let readonly: boolean
  export let modes: Mode[] = []

  $: mode = selectedMode.id

  const dispatch = createEventDispatcher()
</script>

<DropdownLabelsIntl
  items={modes}
  selected={mode}
  disabled={readonly}
  minW0={false}
  kind={'no-border'}
  width={'100%'}
  on:selected={(e) => {
    mode = e.detail
    const prevEditor = (selectedMode.editor ?? selectedMode.withoutEditor) ? null : undefined
    selectedMode = modes.find((m) => m.id === mode) ?? modes[0]
    const newEditor = (selectedMode.editor ?? selectedMode.withoutEditor) ? null : undefined
    dispatch('change', prevEditor !== newEditor)
  }}
/>
