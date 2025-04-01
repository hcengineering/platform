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
  import { NavigationSection } from '../types'
  import { Section } from '../index'
  import NavItem from './NavItem.svelte'
  import { createEventDispatcher } from 'svelte'

  export let sections: NavigationSection[] = []
  export let selected: string | undefined = undefined

  const dispatch = createEventDispatcher()
</script>

<div class="navigation-list">
  {#each sections as section (section.id)}
    <Section id={section.id} title={section.title} expanded={section.expanded} on:toggle>
      {#each section.items as item (item.id)}
        <NavItem
          label={item.label}
          icon={item.icon}
          selected={selected === item.id}
          notificationsCount={item.notificationsCount}
          on:click={() => {
            dispatch('click', item.id)
          }}
        />
      {/each}
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
