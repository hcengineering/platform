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
  import type { DoneState } from '@hcengineering/task'
  import task from '@hcengineering/task'
  import { getPlatformColor } from '@hcengineering/ui'
  import Won from '../icons/Won.svelte'
  import Lost from '../icons/Lost.svelte'

  export let value: DoneState | null | undefined
  export let showTitle: boolean = true

  $: color = value?._class === task.class.WonState ? getPlatformColor(0) : getPlatformColor(11)
</script>

{#if value}
  <div class="flex-center">
    <div class:mr-2={showTitle} style="color: {color};">
      <svelte:component this={value._class === task.class.WonState ? Won : Lost} size={'small'} />
    </div>
    {#if showTitle}
      {value.name}
    {/if}
  </div>
{/if}
