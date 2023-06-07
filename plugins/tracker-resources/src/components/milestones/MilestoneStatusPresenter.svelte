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
  import { Milestone, MilestoneStatus } from '@hcengineering/tracker'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import MilestoneStatusEditor from './MilestoneStatusEditor.svelte'

  export let value: MilestoneStatus
  export let object: Milestone
  export let onChange: ((value: MilestoneStatus) => void) | undefined = undefined
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = '100%'

  $: disabled = onChange === undefined
</script>

<MilestoneStatusEditor
  {value}
  {object}
  {kind}
  {size}
  {width}
  {justify}
  {disabled}
  on:change={({ detail }) => onChange?.(detail)}
/>
