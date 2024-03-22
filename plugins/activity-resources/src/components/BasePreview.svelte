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
  import { getClient, MessageViewer } from '@hcengineering/presentation'
  import { Person, type PersonAccount } from '@hcengineering/contact'
  import {
    Avatar,
    EmployeePresenter,
    personAccountByIdStore,
    personByIdStore,
    SystemAvatar
  } from '@hcengineering/contact-resources'
  import core, { Account, Doc, Ref, Timestamp } from '@hcengineering/core'
  import { Icon, Label, resizeObserver } from '@hcengineering/ui'
  import { Asset, IntlString } from '@hcengineering/platform'
  import activity, { ActivityMessagePreviewType } from '@hcengineering/activity'
  import { classIcon, DocNavLink } from '@hcengineering/view-resources'

  import MessageTimestamp from './MessageTimestamp.svelte'

  export let text: string | undefined = undefined
  export let intlLabel: IntlString | undefined = undefined
  export let readonly = false
  export let type: ActivityMessagePreviewType = 'full'
  export let timestamp: Timestamp
  export let account: Ref<Account> | undefined = undefined
  export let isCompact = false
  export let headerObject: Doc | undefined = undefined
  export let headerIcon: Asset | undefined = undefined
  export let header: IntlString | undefined = undefined

  const client = getClient()
  const limit = 300

  let isActionsOpened = false
  let person: Person | undefined = undefined

  let width: number

  $: isCompact = width < limit

  $: person = getPerson(account, $personAccountByIdStore, $personByIdStore)

  function getPerson (
    _id: Ref<Account> | undefined,
    accountById: Map<Ref<PersonAccount>, PersonAccount>,
    personById: Map<Ref<Person>, Person>
  ): Person | undefined {
    if (_id === undefined) {
      return undefined
    }

    const personAccount = accountById.get(_id as Ref<PersonAccount>)

    if (personAccount === undefined) {
      return undefined
    }

    return personById.get(personAccount.person)
  }

  export function onActionsOpened (): void {
    isActionsOpened = true
  }

  export function onActionsClosed (): void {
    isActionsOpened = false
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="root"
  class:readonly
  class:contentOnly={type === 'content-only'}
  class:actionsOpened={isActionsOpened}
  use:resizeObserver={(element) => {
    width = element.clientWidth
  }}
  on:click
>
  {#if type === 'full'}
    {#if headerObject}
      <Icon icon={headerIcon ?? classIcon(client, headerObject._class) ?? activity.icon.Activity} size="small" />
    {:else if person}
      <Avatar size="card" avatar={person.avatar} name={person.name} />
    {:else}
      <SystemAvatar size="card" />
    {/if}

    <div class="person strong">
      {#if headerObject}
        <DocNavLink object={headerObject} colorInherit>
          <Label label={header ?? client.getHierarchy().getClass(headerObject._class).label} />
        </DocNavLink>
      {:else if person}
        <EmployeePresenter value={person} shouldShowAvatar={false} compact />
      {:else}
        <Label label={core.string.System} />
      {/if}
    </div>

    {#if !isCompact}
      <div class="time">
        <MessageTimestamp date={timestamp} type="secondary" />
      </div>
    {/if}
  {/if}

  {#if text || intlLabel}
    <div class="textContent overflow-label" class:contentOnly={type === 'content-only'}>
      {#if intlLabel}
        <Label label={intlLabel} />
      {/if}
      {#if text}
        <MessageViewer message={text} preview />
      {/if}
    </div>
  {/if}

  <slot name="content" />

  {#if !readonly}
    <div class="actions" class:opened={isActionsOpened}>
      <slot name="actions" />
    </div>
  {/if}
</div>

<style lang="scss">
  .root {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    height: 2.375rem;
    color: var(--global-primary-TextColor);
    border: 1px solid transparent;
    border-radius: var(--extra-small-BorderRadius);
    width: 100%;
    padding: var(--spacing-0_75) var(--spacing-0_5);
    position: relative;

    &.contentOnly {
      padding: 0;
      height: auto;
    }

    &.readonly {
      cursor: default;
    }

    &:hover:not(.readonly) {
      background-color: var(--global-ui-BackgroundColor);
    }

    .actions {
      position: absolute;
      visibility: hidden;
      top: -1.5rem;
      right: 0.75rem;

      &.opened {
        visibility: visible;
      }
    }

    &:hover:not(.readonly) > .actions {
      visibility: visible;
    }

    &.actionsOpened {
      background-color: var(--global-ui-BackgroundColor);
    }
  }

  .person {
    color: var(--global-primary-TextColor);
  }

  .time {
    white-space: nowrap;
    color: var(--global-tertiary-TextColor);
  }

  .textContent {
    display: inline;
    overflow: hidden;
    max-height: 1.25rem;
    color: var(--global-primary-TextColor);
    margin-left: var(--spacing-0_5);

    &.contentOnly {
      margin-left: 0;
    }
  }
</style>
