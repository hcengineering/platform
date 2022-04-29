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
  import type { DoneState } from '@anticrm/task'
  import task from '@anticrm/task'
  import { getPlatformColor } from '@anticrm/ui'

  export let value: DoneState
  export let showTitle: boolean = false

  $: color = value._class === task.class.WonState ? getPlatformColor(0) : getPlatformColor(11)
</script>

{#if value}
  <div class="flex-center">
    <div class="state-container" class:state-container-title={showTitle} style="background-color: {color};" />
    {#if showTitle}
      {value.title}
    {/if}
  </div>
{/if}

<style lang="scss">
  .state-container {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 0.5rem;
  }
  .state-container-title {
    margin-right: 0.75rem;
  }
</style>
