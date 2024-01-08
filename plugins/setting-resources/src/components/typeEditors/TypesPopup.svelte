<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import core from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import { DropdownIntlItem } from '@hcengineering/ui/src/types'
  import { createEventDispatcher } from 'svelte'
  import view from '@hcengineering/view'

  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function getTypes (): DropdownIntlItem[] {
    const descendants = hierarchy.getDescendants(core.class.Type)
    const res: DropdownIntlItem[] = []
    for (const descendant of descendants) {
      const _class = hierarchy.getClass(descendant)
      if (_class.label !== undefined && hierarchy.hasMixin(_class, view.mixin.ObjectEditor)) {
        res.push({
          label: _class.label,
          id: _class._id
        })
      }
    }
    return res
  }

  const items = getTypes()

  const handleSelection = (id: string | number) => {
    dispatch('close', id)
  }
</script>

<div class="hulyPopupMenu-container">
  <div class="hulyPopupMenu-group">
    {#each items as item}
      <button
        class="hulyPopupMenu-group__item"
        on:click={() => {
          handleSelection(item.id)
        }}
      >
        <span class="hulyPopupMenu-group__item-label overflow-label">
          <Label label={item.label} />
        </span>
      </button>
    {/each}
  </div>
</div>

<style lang="scss">
  .hulyPopupMenu-container {
    display: flex;
    align-items: flex-start;
    flex-shrink: 0;
    width: 15rem;
    min-width: 0;
    min-height: 0;
    background-color: var(--global-popover-BackgroundColor);
    border: 1px solid var(--global-popover-BorderColor);
    border-radius: var(--medium-BorderRadius);

    .hulyPopupMenu-group {
      display: flex;
      flex: 1 0 0;
      flex-direction: column;
      justify-content: stretch;
      align-items: flex-start;
      align-self: stretch;
      gap: var(--spacing-0_25);
      padding: var(--spacing-0_5);

      &__item {
        box-sizing: border-box;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-grow: 1;
        margin: 0;
        width: 100%;
        border: 2px solid transparent;
        border-radius: var(--extra-small-focus-BorderRadius);
        outline: 2px solid transparent;

        &.submenu {
          padding: var(--spacing-1_5) var(--spacing-1_5) var(--spacing-1_5) var(--spacing-2);
        }
        &:not(.submenu) {
          padding: var(--spacing-1_5) var(--spacing-2);
        }

        &-icon {
          flex-shrink: 0;
          width: var(--global-min-Size);
          height: var(--global-min-Size);
          color: var(--global-on-accent-TextColor);
        }
        &-label {
          flex-grow: 1;
          text-align: left;
          color: var(--global-on-accent-TextColor);
        }

        &:hover {
          background-color: var(--global-popover-hover-BackgroundColor);
        }
        &:focus {
          background-color: var(--global-popover-hover-BackgroundColor);
          border-color: var(--global-focus-inset-BorderColor);
          outline-color: var(--global-focus-BorderColor);
        }
      }
    }
  }
</style>
