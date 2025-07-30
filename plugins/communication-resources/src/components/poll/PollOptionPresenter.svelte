<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { CheckBox, Loading } from '@hcengineering/ui'
  import { getCurrentAccount, WithLookup } from '@hcengineering/core'
  import { Poll, PollAnswer } from '@hcengineering/communication'
  import { createEventDispatcher } from 'svelte'

  import { PollOption } from '../../poll'

  export let option: PollOption
  export let result: WithLookup<Poll> | undefined
  export let isLoading: boolean
  export let privateAnswers: PollAnswer[]
  export let answer: string | undefined
  export let anonymous: boolean
  export let isVoted: boolean
  export let started: boolean
  export let ended: boolean

  const me = getCurrentAccount()
  const dispatch = createEventDispatcher()

  function getOptionPercentage (optionId: string, result?: Poll): number {
    if (result == null) return 0
    const votes: number = (result as any)[optionId] ?? 0
    if (votes === 0) return 0
    const total = result.totalVotes ?? 0
    return Math.round((votes / total) * 100)
  }

  function isOptionVotedByMe (optionId: string, result?: WithLookup<Poll>, privateAnswers: PollAnswer[] = []): boolean {
    if (result == null) return false
    if (anonymous) {
      return privateAnswers.some((it: PollAnswer) => it.options.includes(optionId)) ?? false
    }
    const myVote = result.userVotes?.find((it) => it.account === me.uuid)
    if (myVote == null) return false
    return myVote.options.some((it) => it.id === optionId)
  }

  $: percentage = getOptionPercentage(option.id, result)
  $: isVotedByMe = isOptionVotedByMe(option.id, result, privateAnswers)
  $: voteKind = getVoteKind(option.id, result)

  function getVoteKind (optionId: string, result: Poll | undefined): 'todo' | 'positive' | 'negative' {
    if (result == null) return 'todo'
    if (answer == null) return 'todo'
    if (optionId === answer) return 'positive'
    return 'negative'
  }
</script>

{#if isVoted || ended}
  <div class="poll-option">
    <div class="poll-option__info">
      <span class="poll-option__percentage">
        {percentage}%
      </span>
      <span class="poll-option__label">
        {option.label}
      </span>
    </div>
    <div class="poll-option__result">
      <span class="option_checkbox">
        {#if isVotedByMe}
          <CheckBox
            checked={true}
            kind={voteKind}
            size="small"
            disabled
            circle
            symbol={voteKind === 'negative' ? 'minus' : 'check'}
          />
        {/if}
      </span>

      {#if percentage > 0}
        <div class="progress-bar {voteKind}" style="width: {percentage}%" />
      {:else}
        <div class="progress-bar zero {voteKind}" />
      {/if}
    </div>
  </div>
{:else}
  <div class="poll-option">
    <div class="poll-option__answer">
      <span class="option_checkbox">
        {#if !isLoading}
          <CheckBox
            checked={false}
            kind="todo"
            size="small"
            disabled={!started || ended}
            on:value={() => {
              dispatch('toggle')
            }}
          />
        {:else}
          <Loading size="small" />
        {/if}
      </span>
      <span class="option_label">
        {option.label}
      </span>
    </div>
  </div>
{/if}

<style lang="scss">
  .poll-option {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.25rem;

    &__answer {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }

    &__percentage {
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;

      width: 2rem;
      max-width: 2rem;
      min-width: 2rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--global-primary-TextColor);
    }

    &__label {
      font-size: 0.75rem;
    }

    &__info {
      display: flex;
      gap: 0.5rem;
    }

    &__result {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      height: 1.5rem;
      min-height: 1.5rem;
    }
  }

  .progress-bar {
    background: var(--global-accent-IconColor);
    width: 0;
    border-radius: 1rem;
    height: 0.5rem;
    transition: width 0.4s ease;

    &.positive {
      background: var(--bg-positive-default);
    }

    &.negative {
      background: var(--bg-negative-default);
    }

    &.zero {
      width: 0.5rem;
    }
  }

  .option_checkbox {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    min-width: 2rem;
    width: 2rem;
    height: 1.5rem;
  }

  .option_label {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    height: 100%;
    min-height: 1.5rem;
  }
</style>
