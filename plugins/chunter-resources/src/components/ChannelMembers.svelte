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
  import { Person } from '@hcengineering/contact'
  import { ButtonIcon, IconDelete, ModernButton, Scroller } from '@hcengineering/ui'
  import { IconAddMember, personByIdStore, UserDetails } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import { createEventDispatcher } from 'svelte'

  import chunter from '../plugin'

  export let ids: Ref<Person>[] = []
  export let disableRemoveFor: Ref<Person>[] = []

  const dispatch = createEventDispatcher()

  let persons: Person[] = []

  $: updatePersons(ids)

  function updatePersons (ids: Ref<Person>[]): void {
    persons = ids.map((_id) => $personByIdStore.get(_id)).filter((person): person is Person => !!person)
  }
</script>

<div class="root">
  <div class="item" style:padding="var(--spacing-1_5)" class:withoutBorder={persons.length === 0}>
    <ModernButton
      label={chunter.string.AddMembers}
      icon={IconAddMember}
      iconSize="small"
      kind="secondary"
      size="small"
      on:click={() => dispatch('add')}
    />
  </div>
  <Scroller>
    {#each persons as person, index}
      <div class="item" class:withoutBorder={index === persons.length - 1}>
        <div class="item__content" class:disabled={disableRemoveFor.includes(person._id)}>
          <UserDetails {person} />
          {#if !disableRemoveFor.includes(person._id)}
            <div class="item__action">
              <ButtonIcon
                icon={IconDelete}
                size="small"
                on:click={() => {
                  dispatch('remove', person._id)
                }}
              />
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </Scroller>
</div>

<style lang="scss">
  .root {
    display: flex;
    flex-direction: column;
    padding: 1px;
    border-radius: 0.75rem;
    background: var(--global-ui-highlight-BackgroundColor);
    border: 1px solid var(--global-ui-BorderColor);
    max-height: 30rem;
  }

  .item {
    padding: var(--spacing-0_75);
    border-bottom: 1px solid var(--global-ui-BorderColor);

    &.withoutBorder {
      border: 0;
    }

    .item__content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-0_75);
      border-radius: var(--small-BorderRadius);
      cursor: pointer;

      &.disabled {
        cursor: default;
      }

      &:hover {
        background: var(--global-ui-highlight-BackgroundColor);

        .item__action {
          visibility: visible;
        }
      }
    }

    .item__action {
      visibility: hidden;

      &:hover {
        visibility: visible;
      }
    }
  }
</style>
