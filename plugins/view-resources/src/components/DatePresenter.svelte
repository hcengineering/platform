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
  import { DateRangePresenter } from '@hcengineering/ui'
  import { DateRangeMode } from '@hcengineering/core'

  export let value: number | null | undefined
  export let onChange: ((value: number | null) => void) | undefined = undefined
  export let noShift: boolean = false
  export let shouldShowAvatar: boolean = true
  export let accent: boolean = false
  export let inline: boolean = false
  export let mode: DateRangeMode = DateRangeMode.DATE
  export let readonly: boolean = false
</script>

{#if onChange !== undefined && !readonly}
  <DateRangePresenter
    {value}
    {noShift}
    {mode}
    editable
    on:change={(e) => onChange?.(e.detail)}
    {shouldShowAvatar}
    {accent}
    {inline}
  />
{:else}
  <DateRangePresenter {value} {noShift} {mode} {shouldShowAvatar} {accent} {inline} />
{/if}
