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
  import { getClient } from '@hcengineering/presentation'
  import type { Opinion } from '@hcengineering/recruit'
  import recruit from '@hcengineering/recruit'
  import { closeTooltip, Icon, showPopup } from '@hcengineering/ui'
  import EditOpinion from './EditOpinion.svelte'

  export let value: Opinion

  function show () {
    closeTooltip()
    showPopup(EditOpinion, { item: value }, element)
  }

  const client = getClient()

  const shortLabel = client.getHierarchy().getClass(value._class).shortLabel ?? ''

  let element: HTMLElement
</script>

{#if value}
  <div class="sm-tool-icon" on:click={show} bind:this={element}>
    <span class="icon">
      <Icon icon={recruit.icon.Opinion} size={'small'} />
    </span>&nbsp;
    {#if value && shortLabel}
      {shortLabel}-{value.number}
    {/if}
  </div>
{/if}
