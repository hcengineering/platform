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
  import { createEventDispatcher } from 'svelte'

  import { ButtonVariant, NavigationSection } from '../types'
  import { Section } from '../index'
  import NavItem from './NavItem.svelte'
  import uiNext from '../plugin'
  import Button from './Button.svelte'

  export let sections: NavigationSection[] = []
  export let selectedItem: string | undefined = undefined
  export let selectedSection: string | undefined = undefined

  const dispatch = createEventDispatcher()
</script>

<div class="navigation-list">
  {#each sections as section (section.id)}
    <Section
      id={section.id}
      title={section.title}
      selected={selectedSection === section.id}
      expanded={section.expanded}
      on:toggle
      on:click={() => {
        dispatch('select', section.id)
      }}
    >
      {#each section.items as item (item.id)}
        <NavItem
          label={item.label}
          icon={item.icon}
          selected={selectedItem === item.id}
          notificationsCount={item.notificationsCount}
          on:click={() => {
            dispatch('selectItem', item.id)
          }}
        />
      {/each}

      {#if section.total > section.items.length}
        <Button
          labelIntl={uiNext.string.All}
          labelParams={{ count: section.total }}
          variant={ButtonVariant.Ghost}
          on:click={() => dispatch('all', section.id)}
        />
      {/if}
    </Section>
  {/each}
</div>

<style lang="scss">
  .navigation-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    overflow: hidden;
  }
</style>
