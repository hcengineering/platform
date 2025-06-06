<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { DateRangeMode } from '@hcengineering/core'

  import DatePresenter from './DatePresenter.svelte'

  export let value: number | null | undefined
  export let onChange: ((value: number | null) => void) | undefined = undefined
  export let noShift: boolean = false
  export let shouldShowAvatar: boolean = false
  export let accent: boolean = false
  export let inline: boolean = false
  export let readonly: boolean = false
</script>

<DatePresenter
  {value}
  {onChange}
  {noShift}
  {shouldShowAvatar}
  {accent}
  {inline}
  mode={DateRangeMode.DATETIME}
  {readonly}
/>
