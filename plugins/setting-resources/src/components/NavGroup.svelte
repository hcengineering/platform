<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import type { IntlString } from '@hcengineering/platform'
  import type { AnyComponent } from '@hcengineering/ui'
  import { Label, Component } from '@hcengineering/ui'

  export let label: IntlString
  export let categoryName: string
  export let selected: boolean = false
  export let tools: AnyComponent | undefined = undefined
  export let collapsed: boolean = false

  $: id = `navGroup-${categoryName}`
</script>

<div class="hulyAccordionItem-container">
  <button class="hulyAccordionItem-header" class:selected on:click={() => (collapsed = !collapsed)}>
    <div class="hulyAccordionItem-header__label font-medium-12">
      <Label {label} />
    </div>
    {#if tools}
      <div class="hulyAccordionItem-header__tools">
        <Component
          is={tools}
          props={{
            kind: 'tools',
            categoryName
          }}
        />
      </div>
    {/if}
  </button>
  <div {id} class="hulyAccordionItem-content" class:collapsed>
    <slot />
  </div>
</div>

<style lang="scss">
  .hulyAccordionItem-container {
    display: flex;
    flex-direction: column;
    min-width: 0;
    border-top: 1px solid var(--theme-navpanel-divider);
    // border-bottom: 1px solid var(--theme-navpanel-divider); // var(--global-surface-01-BorderColor);

    .hulyAccordionItem-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
      gap: 0.5rem;
      padding: 0 1rem;
      height: 2.5rem;
      border: none;
      outline: none;

      &__label {
        white-space: nowrap;
        word-break: break-all;
        text-overflow: ellipsis;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 0.125rem 0.25rem;
        min-width: 0;
        text-transform: uppercase;
        color: var(--global-tertiary-TextColor);
        border-radius: 0.25rem;
      }
      &__tools {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        gap: 0.25rem;
        min-width: 0;
      }

      &:hover .hulyAccordionItem-header__label {
        color: var(--global-primary-TextColor);
        background-color: var(--global-ui-hover-BackgroundColor);
      }
      &.selected .hulyAccordionItem-header__label {
        color: var(--global-secondary-TextColor);
        background-color: var(--global-ui-BackgroundColor);
      }
    }
    .hulyAccordionItem-content {
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding-bottom: 0.75rem;
      min-width: 0;
      max-height: 100%;

      &.collapsed {
        padding-bottom: 0;
        max-height: 0;
      }
    }
  }
  // :global(.hulyAccordionItem-container) + .hulyAccordionItem-container {
  //   border-top: none;
  // }
</style>
