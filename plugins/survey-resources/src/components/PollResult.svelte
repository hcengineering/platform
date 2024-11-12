<!--
//
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
//
-->
<script lang="ts">
  import { Card } from '@hcengineering/presentation'
  import { Poll } from '@hcengineering/survey'
  import { FocusHandler, Label, createFocusManager } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import survey from '../plugin'
  import { hasText } from '../utils'

  const dispatch = createEventDispatcher()
  const manager = createFocusManager()

  export let poll: Poll

  onMount(() => {
    dispatch('open', {})
  })
</script>

<FocusHandler {manager} />

<Card
  label={survey.string.Survey}
  canSave={true}
  okLabel={survey.string.Close}
  okAction={() => {
    dispatch('close')
  }}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="title">
    {#if hasText(poll.name)}
      {poll.name}
    {:else}
      <Label label={survey.string.NoName} />
    {/if}
  </svelte:fragment>

  <div class="antiSection">
    {#if hasText(poll.prompt)}
      <div class="antiSection-header">
        <span class="antiSection-header__title">
          {poll.prompt}
        </span>
      </div>
    {/if}
    {#each poll.results ?? [] as result}
      <div class="antiSection question">
        <div class="antiSection-header">
          <span class="antiSection-header__title">
            {result.question}
          </span>
        </div>
        {#if result.answer === undefined || result.answer === null || result.answer.length === 0}
          <div class="answer empty">
            <Label label={survey.string.NoAnswer} />
          </div>
        {:else}
          {#each result.answer as answer}
            <div class="answer">
              {answer}
            </div>
          {/each}
        {/if}
      </div>
    {/each}
  </div>
</Card>

<style lang="scss">
  .question {
    margin-top: 1.25em;
  }
  .answer {
    margin-left: 2em;
    margin-top: 0.5em;

    &.empty {
      opacity: 0.7;
    }
  }
</style>
