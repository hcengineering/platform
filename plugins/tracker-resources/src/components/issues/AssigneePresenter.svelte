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
  import { Employee, formatName } from '@anticrm/contact'
  import { Hierarchy } from '@anticrm/core'
  import { Avatar } from '@anticrm/presentation'
  import { showPanel, Tooltip } from '@anticrm/ui'
  import view from '@anticrm/view'
  import tracker from '../../plugin'

  export let value: Employee
  export let inline: boolean = false

  const onClick = async () => {
    showPanel(view.component.EditDoc, value._id, Hierarchy.mixinOrClass(value), 'full')
  }
</script>

{#if value}
  <Tooltip label={tracker.string.AssignedTo} props={{ value: formatName(value.name) }}>
    <a
      class="flex-presenter"
      class:inline-presenter={inline}
      href="#{encodeURIComponent([view.component.EditDoc, value._id, Hierarchy.mixinOrClass(value)].join('|'))}"
      on:click={onClick}
    >
      <div class="icon">
        <Avatar size={'x-small'} avatar={value.avatar} />
      </div>
    </a>
  </Tooltip>
{/if}
