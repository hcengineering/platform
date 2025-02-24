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
  import { DirectMessage } from '@hcengineering/chunter'
  import contact, { Person } from '@hcengineering/contact'
  import { Avatar, CombineAvatars } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Icon, IconSize } from '@hcengineering/ui'
  import { classIcon } from '@hcengineering/view-resources'

  import chunter from '../plugin'
  import { getDmPersons } from '../utils'

  export let value: DirectMessage | undefined
  export let _id: Ref<DirectMessage> | undefined = undefined
  export let size: IconSize = 'small'
  export let showStatus = false
  export let compact = false

  const visiblePersons = 4
  const client = getClient()

  let persons: Person[] = []

  if (_id !== undefined && value === undefined) {
    void client.findOne(chunter.class.DirectMessage, { _id }).then((res) => {
      value = res
    })
  } else if (_id && value && value._id !== _id) {
    value = undefined
  }

  $: if (value !== undefined) {
    void getDmPersons(client, value).then((res) => {
      persons = res
    })
  }

  let avatarSize = size

  $: if (size === 'small') {
    avatarSize = 'x-small'
  }
</script>

{#if persons.length === 0}
  <Icon icon={classIcon(client, chunter.class.DirectMessage) ?? chunter.icon.Chunter} {size} />
{/if}

{#if persons.length === 1}
  <Avatar person={persons[0]} size={avatarSize} name={persons[0].name} {showStatus} />
{/if}

{#if persons.length > 1 && size === 'medium'}
  <div class="group">
    {#each persons.slice(0, visiblePersons - 1) as person}
      <Avatar {person} size="tiny" name={person.name} />
    {/each}
    {#if persons.length > visiblePersons}
      <div class="rect">
        +{persons.length - visiblePersons + 1}
      </div>
    {/if}
    {#if persons.length < visiblePersons}
      {#each Array(visiblePersons - persons.length) as _}
        <div class="rect" />
      {/each}
    {/if}
  </div>
{/if}

{#if persons.length > 1 && size !== 'medium'}
  {#if compact}
    <div class="hulyAvatar-container hulyAvatarSize-{size} group-ava">
      {persons.length}
    </div>
  {:else}
    <CombineAvatars
      _class={contact.class.Person}
      items={persons.map(({ _id }) => _id)}
      size={avatarSize}
      limit={visiblePersons}
    />
  {/if}
{/if}

<style lang="scss">
  .group {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    height: 2.5rem;
    width: 2.5rem;
    min-width: 2.5rem;
    min-height: 2.5rem;
    border: 1px solid transparent;
    border-radius: 0.5rem;
  }

  .rect {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.13rem;
    height: 1.13rem;
    border: 1px solid transparent;
    border-radius: 0.25rem;
    background-color: var(--theme-button-hovered);
    font-size: 0.688rem;
    font-weight: 500;
  }

  .group-ava {
    color: var(--theme-caption-color);
    background-color: var(--theme-bg-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.25rem;
    opacity: 0.9;

    &.inline,
    &.tiny,
    &.card,
    &.x-small {
      font-size: 0.625rem;
    }
  }
</style>
