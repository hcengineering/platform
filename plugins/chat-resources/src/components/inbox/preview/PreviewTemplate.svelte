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
  import { Person, formatName } from '@hcengineering/contact'
  import { IntlString } from '@hcengineering/platform'
  import { resizeObserver, TimeSince, tooltip } from '@hcengineering/ui'
  import {
    Avatar,
    PersonPreviewProvider,
    SystemAvatar,
    employeeByPersonIdStore,
    getPersonByPersonId
  } from '@hcengineering/contact-resources'
  import { SocialID } from '@hcengineering/communication-types'
  import { isViewSettingEnabled, hideUserNamesSettingId, viewSettingsStore } from '../../../settings'

  export let tooltipLabel: IntlString | undefined = undefined
  export let person: Person | undefined = undefined
  export let socialId: SocialID
  export let date: Date
  export let color: 'primary' | 'secondary' = 'primary'
  export let kind: 'default' | 'column' = 'default'
  export let padding: string | undefined = undefined
  export let fixHeight: boolean = false
  export let showSeparator: boolean = true

  let clientWidth: number

  $: showPersonName = clientWidth > 300 && !isViewSettingEnabled($viewSettingsStore, hideUserNamesSettingId)

  let _person: Person | undefined
  $: void updatePerson(socialId, person)

  async function updatePerson (socialId: SocialID, person: Person | undefined): Promise<void> {
    _person = person ?? $employeeByPersonIdStore.get(socialId)
    if (!_person) {
      _person = (await getPersonByPersonId(socialId)) ?? undefined
    }
  }
</script>

{#if kind === 'column'}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="message-preview-template clear-mins {color} {kind}"
    style:padding
    use:resizeObserver={(element) => (clientWidth = element.clientWidth)}
  >
    <span class="message-preview-template__column-header">
      {#if _person}
        <span class="overflow-label clear-mins">
          <PersonPreviewProvider value={_person} inline>
            {formatName(_person?.name ?? '')}
          </PersonPreviewProvider>
        </span>
      {/if}
    </span>

    <span class="message-preview-template__left">
      <span
        class="message-preview-template__content overflow-label {color}"
        class:fixHeight
        use:tooltip={tooltipLabel ? { label: tooltipLabel } : undefined}
      >
        <slot />
      </span>

      <slot name="after" />
    </span>
  </div>
{:else}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="message-preview-template clear-mins {color}"
    use:resizeObserver={(element) => (clientWidth = element.clientWidth)}
  >
    <span class="message-preview-template__left">
      <PersonPreviewProvider value={_person} inline>
        <span class="message-preview-template__person">
          <span class="message-preview-template__avatar">
            {#if _person}
              <Avatar size="card" person={_person} name={_person.name} />
            {:else}
              <SystemAvatar size="card" />
            {/if}
          </span>
          {#if showPersonName && _person}
            <span class="message-preview-template__name overflow-label {color}">{formatName(_person?.name ?? '')}</span>
          {/if}
          {#if showSeparator}
            {#if showPersonName}
              <span class="message-preview-template__separator"> • </span>
            {:else}
              <span class="mr-0-5" />
            {/if}
          {/if}
        </span>
      </PersonPreviewProvider>

      {#if $$slots.content}
        <span
          class="message-preview-template__content overflow-label {color}"
          class:fixHeight
          use:tooltip={tooltipLabel ? { label: tooltipLabel, textAlign: 'left' } : undefined}
        >
          <slot name="content" />
        </span>
      {/if}
      <slot name="after" />
    </span>

    <span class="message-preview-template__time clear-mins">
      <TimeSince value={date.getTime()} />
    </span>
  </div>
{/if}

<style lang="scss">
  .message-preview-template {
    display: flex;
    align-items: center;
    width: 100%;
    max-width: 100%;
    min-height: 2rem;
    color: var(--global-secondary-TextColor);
    padding: 0.25rem var(--spacing-1_25) 0.25rem var(--spacing-1_25);
    overflow: hidden;
    font-size: 0.875rem;
    gap: 0.25rem;

    &.column {
      flex-direction: column;
      align-items: flex-start;
    }

    &__left {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      min-width: 2.75rem;
      overflow: hidden;
      max-width: 100%;
      flex: 1;
    }

    &__person {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: var(--global-primary-TextColor);
      font-size: 0.875rem;
    }

    &__avatar {
      width: 1.325rem;
      min-width: 1.325rem;
      height: 1.325rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 0.25rem;
    }

    &__content {
      display: inline;
      color: var(--global-primary-TextColor);
      max-width: 100%;

      &.fixHeight {
        max-height: 1.375rem;
      }

      &.secondary {
        color: var(--global-secondary-TextColor);
      }
    }

    &__separator {
      font-size: 0.875rem;
      min-width: 0.375rem;
      flex: 0 0 auto;
      color: var(--global-primary-TextColor);
      margin: 0 0.25rem;
    }

    &__name {
      font-weight: 500;
      flex: 0 0 auto;

      &.secondary {
        color: var(--global-secondary-TextColor);
      }
    }

    &__time {
      display: flex;
      align-items: center;
      font-size: 0.75rem;
      color: var(--global-tertiary-TextColor);
      white-space: nowrap;
      margin-left: auto;
      max-width: 100%;
      min-width: 0;
      width: fit-content;
    }

    &__column-header {
      display: flex;
      align-items: center;
      max-width: 100%;
      gap: var(--spacing-0_5);
      font-weight: 500;
      color: var(--global-primary-TextColor);
    }
  }
</style>
