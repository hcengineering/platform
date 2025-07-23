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
  import { Label, Modal, Scroller } from '@hcengineering/ui'
  import { employeeByAccountStore, UserDetails } from '@hcengineering/contact-resources'
  import { Poll } from '@hcengineering/communication'
  import { AccountUuid, notEmpty } from '@hcengineering/core'
  import { Employee } from '@hcengineering/contact'

  import { PollConfig } from '../../poll'
  import communication from '../../plugin'

  export let params: PollConfig
  export let result: Poll

  $: total = result.totalVotes ?? 0

  function getVotedPersons (optionId: string, result: Poll, employeeByAccount: Map<AccountUuid, Employee>): Employee[] {
    return (result.userVotes ?? [])
      .filter((it) => it.options.some((it) => it.id === optionId))
      .map((it) => employeeByAccount.get(it.account))
      .filter(notEmpty)
  }

  function getOptionResult (optionId: string, result: Poll): number {
    return (result as any)[optionId] ?? 0
  }
</script>

<Modal label={communication.string.PollResults} type="type-popup" width="large" hideFooter on:close>
  <div class="hulyModal-content__titleGroup" style="padding: 0">
    <div class="title">
      {params.question}
    </div>
    <span class="votes-count">
      <Label label={communication.string.VotesCount} params={{ count: result.totalVotes }} />
    </span>

    <div class="mt-8" />

    {#each params.options as option}
      {@const opResult = getOptionResult(option.id, result)}
      {@const votedPersons = getVotedPersons(option.id, result, $employeeByAccountStore)}
      {#if opResult > 0}
        <div class="option">
          <div class="option__header">
            <span class="option__label overflow-label" title={option.label}>
              {option.label}
            </span>
            <span class="option__percentage">
              - {Math.round((opResult / total) * 100)}%
            </span>
            <span class="option__result">
              <Label label={communication.string.VotesCount} params={{ count: opResult }} />
            </span>
          </div>

          <div class="user-list">
            <Scroller>
              {#each votedPersons as person, index}
                <div class="user-list__item" class:withoutBorder={index === votedPersons.length - 1}>
                  <div class="user-list__item__content">
                    <UserDetails {person} showStatus />
                  </div>
                </div>
              {/each}
            </Scroller>
          </div>
        </div>
      {/if}
    {/each}
  </div>
</Modal>

<style lang="scss">
  .title {
    font-size: 1rem;
    font-weight: 500;
    color: var(--global-primary-TextColor);
  }

  .votes-count {
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: var(--global-secondary-TextColor);
  }

  .option {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    white-space: nowrap;
    margin-bottom: 1rem;

    &__header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow: hidden;
      padding: 0 0.25rem;
    }

    &__label {
      font-size: 0.875rem;
      color: var(--global-secondary-TextColor);
      flex-shrink: 1;
    }

    &__percentage {
      font-size: 0.875rem;
      color: var(--global-secondary-TextColor);
      margin-left: -0.375rem;
      margin-right: 1rem;
    }

    &__result {
      font-size: 0.875rem;
      color: var(--global-secondary-TextColor);
      margin-left: auto;
    }
  }

  .user-list {
    display: flex;
    flex-direction: column;
    border-radius: 0.75rem;
    background: var(--global-ui-highlight-BackgroundColor);
    border: 1px solid var(--global-ui-BorderColor);
    max-height: 30rem;

    &__item {
      padding: var(--spacing-0_75);
      border-bottom: 1px solid var(--global-ui-BorderColor);

      &.withoutBorder {
        border: 0;
      }

      &__content {
        display: flex;
        align-items: center;
        padding: var(--spacing-0_75);
        border-radius: var(--small-BorderRadius);
      }
    }
  }
</style>
