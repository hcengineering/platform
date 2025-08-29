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
  import { Direct } from '@hcengineering/communication'
  import { Icon, IconSize } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import contact, { Employee, getCurrentEmployee, Person } from '@hcengineering/contact'
  import { classIcon } from '@hcengineering/view-resources'
  import { Ref } from '@hcengineering/core'
  import { Avatar, employeeByIdStore, getPersonByPersonRef } from '@hcengineering/contact-resources'

  import communication from '../plugin'

  export let value: Direct | undefined = undefined
  export let size: IconSize = 'small'
  export let showStatus = true

  const visiblePersons = 4
  const client = getClient()
  const me = getCurrentEmployee()

  let persons: Person[] = []

  $: void updatePersons(value?.members ?? [], $employeeByIdStore)

  async function updatePersons (members: Ref<Person>[], employeeById: Map<Ref<Employee>, Employee>): Promise<void> {
    const res: Person[] = []

    for (const member of members) {
      const p = employeeById.get(member as Ref<Employee>)
      if (p !== undefined) {
        res.push(p)
      } else {
        const person = await getPersonByPersonRef(member)
        if (person != null) {
          res.push(person)
        }
      }
    }
    persons = res
  }

  let avatarSize = size

  $: if (size === 'x-small') {
    avatarSize = 'tiny'
  } else if (size === 'small') {
    avatarSize = 'x-small'
  } else if (size === 'medium') {
    avatarSize = 'small'
  } else if (size === 'large') {
    avatarSize = 'medium'
  }

  $: withoutMe = persons.filter((it) => it._id !== me)
</script>

{#if persons.length === 0}
  <Icon icon={classIcon(client, communication.type.Direct) ?? contact.icon.Contacts} {size} />
{:else if withoutMe.length === 1 || persons.length === 1}
  {@const p = withoutMe[0] ?? persons[0]}
  <Avatar person={p} size={avatarSize} name={p.name} {showStatus} />
{:else if persons.length > 1 && (size === 'medium' || avatarSize === 'medium')}
  <div class="group">
    {#each persons.slice(0, visiblePersons - 1) as person}
      <Avatar {person} size="tiny" name={person.name} />
    {/each}
    {#if persons.length === visiblePersons}
      {@const person = persons[persons.length - 1]}
      <Avatar {person} size="tiny" name={person.name} />
    {:else if persons.length > visiblePersons}
      <div class="rect">
        +{persons.length - visiblePersons + 1}
      </div>
    {:else if persons.length < visiblePersons}
      {#each Array(visiblePersons - persons.length) as _}
        <div class="rect" />
      {/each}
    {/if}
  </div>
{:else if persons.length > 1}
  <span class="relative">
    <svg width="0" height="0" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="direct-count-marker" clipPathUnits="objectBoundingBox">
          <path d="M1,0 H0 V1 H0.48 V0.73 C0.48,0.58 0.58,0.48 0.73,0.48 H1 Z" />
        </clipPath>
      </defs>
    </svg>
    <Avatar
      person={persons.find((it) => it._id !== me) ?? persons[0]}
      size={avatarSize}
      name={persons[0].name}
      showStatus={false}
      clipPath="url(#direct-count-marker)"
    />
    <span class="persons-count {avatarSize}">
      {#if persons.length > 10}
        9+
      {:else}
        {persons.length - 1}
      {/if}
    </span>
  </span>
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

  .persons-count {
    position: absolute;
    right: -0.188rem;
    bottom: -0.188rem;
    width: 0.938rem;
    height: 0.938rem;
    background: var(--avatar-counter-BackgroundColor);
    border: 1px solid var(--global-ui-BorderColor);
    font-size: 0.625rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.313rem;
    color: var(--global-secondary-TextColor);
    font-weight: 500;

    &.medium {
      right: -0.313rem;
      bottom: -0.313rem;
      width: 1.5rem;
      height: 1.5rem;
      font-size: 0.75rem;
      border-radius: 0.5rem;
    }
  }
</style>
