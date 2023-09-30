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
  import calendar from '@hcengineering/calendar'
  import { getName, Person } from '@hcengineering/contact'
  import { Avatar } from '@hcengineering/contact-resources'
  import { getClient } from '@hcengineering/presentation'
  import { tooltip } from '@hcengineering/ui'
  import { openDoc } from '@hcengineering/view-resources'

  export let value: Person | Person[]
  export let inline: boolean = false

  let persons: Person[] = []
  $: persons = Array.isArray(value) ? value : [value]
  const hierarchy = getClient().getHierarchy()

  async function onClick (p: Person) {
    openDoc(hierarchy, p)
  }
  const client = getClient()
</script>

{#if value}
  <div class="flex persons">
    {#each persons as p}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="flex-presenter"
        class:inline-presenter={inline}
        use:tooltip={{ label: calendar.string.PersonsLabel, props: { name: getName(client.getHierarchy(), p) } }}
        on:click={() => onClick(p)}
      >
        <div class="icon">
          <Avatar size={'x-small'} avatar={p.avatar} name={p.name} />
        </div>
      </div>
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
