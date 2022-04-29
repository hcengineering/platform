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
  import { Hierarchy } from '@anticrm/core'
  import { Avatar } from '@anticrm/presentation'
  import calendar from '../plugin'
  import { showPanel, Tooltip } from '@anticrm/ui'
  import view from '@anticrm/view'

  export let value: Person | Person[]
  export let inline: boolean = false

  let persons: Person[] = []
  $: persons = Array.isArray(value) ? value : [value]

  async function onClick (p: Person) {
    showPanel(view.component.EditDoc, p._id, Hierarchy.mixinOrClass(p), 'content')
  }
</script>

{#if value}
  <div class="flex persons">
    {#each persons as p}
      <Tooltip label={calendar.string.PersonsLabel} props={{ name: formatName(p.name) }}>
        <div class="flex-presenter" class:inline-presenter={inline} on:click={() => onClick(p)}>
          <div class="icon">
            <Avatar size={'x-small'} avatar={p.avatar} />
          </div>
        </div>
      </Tooltip>
    {/each}
  </div>
{/if}

<style lang="scss">
  .persons {
    display: grid;
    grid-template-columns: repeat(4, min-content);
    .icon {
      margin: 0.25rem;
    }
  }
</style>
