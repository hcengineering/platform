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
  import { Asset, IntlString } from '@hcengineering/platform'
  import { IssuePriority } from '@hcengineering/tracker'
  import { Icon, Label, getPlatformColorDef, themeStore } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import { IssuePriorityColor, issuePriorities } from '../../utils'

  export let value: IssuePriority | undefined

  let label: IntlString, icon: Asset
  $: if (value !== undefined) ({ label, icon } = issuePriorities[value])

  const dispatch = createEventDispatcher()
  $: accentColor = getPlatformColorDef(
    IssuePriorityColor[value !== undefined ? value : IssuePriority.NoPriority],
    $themeStore.dark
  )

  $: dispatch('accent-color', accentColor)
  onMount(() => {
    dispatch('accent-color', accentColor)
  })
</script>

{#if value !== undefined}
  <div class="flex-presenter">
    <div class="icon">
      <Icon {icon} size={'small'} />
    </div>
    <span class="overflow-label">
      <Label {label} />
    </span>
  </div>
{/if}
