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
  import { Avatar, CombineAvatars } from '@hcengineering/contact-resources'
  import { Icon, IconSize } from '@hcengineering/ui'
  import contact, { Person } from '@hcengineering/contact'
  import { classIcon } from '@hcengineering/view-resources'
  import { getClient } from '@hcengineering/presentation'

  import chunter from '../plugin'
  import { getDmPersons } from '../utils'

  export let value: DirectMessage | undefined
  export let size: IconSize = 'small'

  const visiblePersons = 4
  const client = getClient()

  let persons: Person[] = []

  $: value &&
    getDmPersons(client, value).then((res) => {
      persons = res
    })

  let avatarSize = size

  $: if (size === 'small') {
    avatarSize = 'tiny'
  }
</script>

{#if persons.length === 0 && value}
  <Icon icon={classIcon(client, value._class) ?? chunter.icon.Chunter} {size} />
{/if}

{#if persons.length === 1}
  <Avatar avatar={persons[0].avatar} size={avatarSize} name={persons[0].name} />
{/if}

{#if persons.length > 1 && size === 'medium'}
  <div class="group">
    {#each persons.slice(0, visiblePersons - 1) as person}
      <Avatar avatar={person.avatar} size="tiny" name={person.name} />
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
  <CombineAvatars
    _class={contact.class.Person}
    items={persons.map(({ _id }) => _id)}
    size={avatarSize}
    limit={visiblePersons}
  />
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
</style>
