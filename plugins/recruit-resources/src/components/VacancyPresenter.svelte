<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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
  import type { Vacancy } from '@anticrm/recruit'
  import recruit from '../plugin'
  import { Icon } from '@anticrm/ui'
  import { showPanel } from '@anticrm/ui/src/panelup'

  export let value: Vacancy
  export let inline: boolean = false

  function show () {
    showPanel(recruit.component.EditVacancy, value._id, value._class, 'right')
  }
</script>

{#if value}
  <div class="flex-presenter" class:inline-presenter={inline} on:click={show}>
    <div class="icon">
      <Icon icon={recruit.icon.Vacancy} size={'small'} />
    </div>
    <span class="label">{value.name}</span>
  </div>
{/if}
