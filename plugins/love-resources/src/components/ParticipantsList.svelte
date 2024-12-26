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
  import { Avatar, personByIdStore } from '@hcengineering/contact-resources'
  import { ParticipantInfo } from '@hcengineering/love'
  import { Scroller } from '@hcengineering/ui'

  export let items: (ParticipantInfo & { onclick?: (e: MouseEvent) => void })[]
</script>

<Scroller padding={'.25rem'} gap={'flex-gap-2'}>
  {#each items as participant (participant.person)}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="flex-row-center flex-no-shrink flex-gap-2"
      class:cursor-pointer={participant.onclick !== undefined}
      on:click={(e) => participant.onclick?.(e)}
    >
      <div class="min-w-6">
        <Avatar
          name={$personByIdStore.get(participant.person)?.name ?? participant.name}
          size={items.length < 10 ? 'small' : 'card'}
          person={$personByIdStore.get(participant.person)}
        />
      </div>
      {participant.name}
    </div>
  {/each}
</Scroller>
