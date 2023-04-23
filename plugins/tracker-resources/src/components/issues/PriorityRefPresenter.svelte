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
  import { IssuePriority } from '@hcengineering/tracker'
  import { Icon, Label } from '@hcengineering/ui'
  import { issuePriorities } from '../../utils'

  export let value: IssuePriority
  export let size: 'small' | 'medium' = 'small'
  export let colorInherit: boolean = false
  export let accent: boolean = false
  export let inline: boolean = false

  $: icon = issuePriorities[value]?.icon
  $: label = issuePriorities[value]?.label
</script>

<div class="flex-presenter cursor-default">
  {#if !inline && icon}
    <Icon {icon} {size} fill={'var(--theme-caption-color)'} />
  {/if}
  <span
    class="overflow-label"
    class:ml-2={!inline && icon}
    style:color={colorInherit ? 'inherit' : 'var(--theme-content-color)'}
    class:fs-bold={accent}
  >
    <Label {label} />
  </span>
</div>
