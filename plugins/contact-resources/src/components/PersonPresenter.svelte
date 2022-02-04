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
  import { formatName, Person } from '@anticrm/contact'
  import { Avatar } from '@anticrm/presentation'
  import { showPanel } from '@anticrm/ui'
  import view from '@anticrm/view'

  export let value: Person
  export let inline: boolean = false

  async function onClick () {
    showPanel(view.component.EditDoc, value._id, value._class, 'full')
  }
</script>

{#if value}
  <div class="flex-presenter" class:inline-presenter={inline} on:click={onClick}>
    <div class="icon">
      <Avatar size={'x-small'} avatar={value.avatar} />
    </div>
    <span class="label">{formatName(value.name)}</span>
  </div>
{/if}
