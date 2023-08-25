<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { Person } from '@hcengineering/contact'
  import { ContactRefPresenter } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import { Button, IconClose } from '@hcengineering/ui'

  export let participant: Ref<Person> | undefined = undefined
  export let externalParticipant: string | undefined = undefined
  export let disabled: boolean = false
  export let focusIndex: number = -1

  const dispatch = createEventDispatcher()
</script>

{#if participant !== undefined}
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <div class="antiOption step-tb25" tabindex={focusIndex}>
    <ContactRefPresenter disabled value={participant} />
    <div class="tools">
      <Button
        icon={IconClose}
        kind={'ghost'}
        size={'x-small'}
        padding={'0 .5rem'}
        focusIndex={-1}
        noFocus
        on:click={() => {
          dispatch('removeParticipant', participant)
        }}
      />
    </div>
  </div>
{:else if externalParticipant !== undefined}
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <div class="antiOption step-tb25" tabindex={focusIndex}>
    <span class="ml-8 overflow-label">{externalParticipant}</span>
    <div class="tools">
      <Button
        icon={IconClose}
        kind={'ghost'}
        size={'x-small'}
        padding={'0 .5rem'}
        focusIndex={-1}
        noFocus
        on:click={() => {
          dispatch('removeExtParticipant', externalParticipant)
        }}
      />
    </div>
  </div>
{/if}
