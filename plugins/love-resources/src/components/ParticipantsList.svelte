<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { Avatar, getPersonByPersonRefStore } from '@hcengineering/contact-resources'
  import { Scroller } from '@hcengineering/ui'
  import { formatName, Person } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'

  export let items: (Ref<Person> & { onclick?: (e: MouseEvent) => void })[]

  $: personByRefStore = getPersonByPersonRefStore(items)
</script>

<Scroller padding={'.25rem'} gap={'flex-gap-2'}>
  {#each items as item}
    {@const person = $personByRefStore.get(item)}

    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="flex-row-center flex-no-shrink flex-gap-2"
      class:cursor-pointer={item.onclick !== undefined}
      on:click={(e) => item.onclick?.(e)}
    >
      <div class="min-w-6">
        <Avatar name={person?.name} size={items.length < 10 ? 'small' : 'card'} {person} />
      </div>
      {formatName(person?.name ?? '')}
    </div>
  {/each}
</Scroller>
