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
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import type { Vacancy } from '@hcengineering/recruit'
  import { ActionIcon, Icon, IconEdit } from '@hcengineering/ui'
  import { openDoc } from '@hcengineering/view-resources'
  import recruit from '../plugin'

  export let value: Vacancy
  export let inline: boolean = false
  export let action: ((item: Ref<Vacancy>) => void) | undefined = undefined

  function editVacancy (): void {
    openDoc(getClient().getHierarchy(), value)
  }
</script>

{#if value}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="flex-presenter"
    class:inline-presenter={inline}
    on:click={() => {
      if (action !== undefined) {
        action(value._id)
      } else {
        editVacancy()
      }
    }}
  >
    <div class="icon">
      <Icon icon={recruit.icon.Vacancy} size={'small'} />
    </div>
    <span class="label">{value.name}</span>
    {#if action !== undefined}
      <div class="action">
        <ActionIcon label={recruit.string.Edit} size={'small'} icon={IconEdit} action={editVacancy} />
      </div>
    {/if}
  </div>
{/if}
