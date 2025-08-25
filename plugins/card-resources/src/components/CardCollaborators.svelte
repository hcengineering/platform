<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Employee, Person } from '@hcengineering/contact'
  import { ButtonIcon, IconDelete, ModernButton, Scroller } from '@hcengineering/ui'
  import { employeeByIdStore, IconAddMember, UserDetails } from '@hcengineering/contact-resources'
  import { notEmpty, Ref } from '@hcengineering/core'
  import { createEventDispatcher } from 'svelte'

  import card from '../plugin'

  export let ids: Ref<Employee>[] = []
  export let disableRemoveFor: Ref<Person>[] = []

  const dispatch = createEventDispatcher()

  $: employees = ids.map((_id) => $employeeByIdStore.get(_id)).filter(notEmpty)
</script>

<div class="root">
  <div class="item" style:padding="var(--spacing-1_5)" class:withoutBorder={employees.length === 0}>
    <ModernButton
      label={card.string.AddCollaborators}
      icon={IconAddMember}
      iconSize="small"
      kind="secondary"
      size="small"
      on:click={() => dispatch('add')}
    />
  </div>
  <Scroller>
    {#each employees as employee, index (employee._id)}
      <div class="item" class:withoutBorder={index === employees.length - 1}>
        <div class="item__content" class:disabled={disableRemoveFor.includes(employee._id)}>
          <UserDetails person={employee} showStatus />
          {#if !disableRemoveFor.includes(employee._id)}
            <div class="item__action">
              <ButtonIcon
                icon={IconDelete}
                size="small"
                on:click={() => {
                  dispatch('remove', employee._id)
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
    width: 100%;
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
