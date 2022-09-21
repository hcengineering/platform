<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { Reaction } from '@hcengineering/chunter'
  import { Account, Ref } from '@hcengineering/core'
  import { tooltip } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import ReactionsTooltip from './ReactionsTooltip.svelte'

  export let reactions: Reaction[] = []

  const dispatch = createEventDispatcher()

  let reactionsAccounts: Map<string, Ref<Account>[]> = new Map()
  $: {
    reactionsAccounts.clear()
    reactions.forEach((r) => {
      let accounts = reactionsAccounts.get(r.emoji)
      accounts = accounts ? [...accounts, r.createBy] : [r.createBy]
      reactionsAccounts.set(r.emoji, accounts)
    })
    reactionsAccounts = reactionsAccounts
  }
</script>

<div class="container">
  {#each [...reactionsAccounts] as [emoji, accounts]}
    <div class="reaction over-underline">
      <div
        class="flex-row-center"
        use:tooltip={{ component: ReactionsTooltip, props: { reactionAccounts: accounts } }}
        on:click={() => {
          dispatch('remove', emoji)
        }}
      >
        <div>{emoji}</div>
        <div class="caption-color counter">{accounts.length}</div>
      </div>
    </div>
  {/each}
</div>

<style lang="scss">
  .container {
    display: flex;
    user-select: none;

    .counter {
      margin-left: 0.25rem;
    }
    .reaction + .reaction {
      margin-left: 1rem;
    }
  }
</style>
