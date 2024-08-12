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
  import { getClient } from '@hcengineering/presentation'
  import core, { SpaceType, SpaceTypeDescriptor } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import { SpaceTypeEditor } from '@hcengineering/setting'
  import {
    ButtonIcon,
    Component,
    IconDescription,
    NavItem,
    Scroller,
    Separator,
    defineSeparators,
    secondNavSeparators
  } from '@hcengineering/ui'

  export let type: SpaceType
  export let descriptor: SpaceTypeDescriptor | undefined
  export let editorDescriptor: SpaceTypeEditor
  export let visibleSecondNav: boolean = true
  export let readonly: boolean = true

  const client = getClient()

  $: if (descriptor === undefined) {
    void loadDescriptor()
  }

  async function loadDescriptor (): Promise<void> {
    descriptor = await client.findOne(core.class.SpaceTypeDescriptor, { _id: type.descriptor })
  }

  const navigator: {
    id: string
    label: IntlString
  }[] =
    editorDescriptor !== undefined
      ? editorDescriptor.sections.map(({ id, label }) => ({
        id,
        label
      }))
      : []

  const sectionRefs: Record<string, HTMLElement | undefined> = {}

  defineSeparators('spaceTypeEditor', secondNavSeparators)
</script>

{#if type !== undefined && descriptor !== undefined}
  <div class="hulyComponent-content__container columns">
    {#if visibleSecondNav}
      <div class="hulyComponent-content__column">
        <div class="hulyComponent-content__navHeader">
          <div class="hulyComponent-content__navHeader-menu">
            <ButtonIcon kind="tertiary" icon={IconDescription} size="small" inheritColor />
          </div>
        </div>
        {#each navigator as navItem, i (navItem.id)}
          <NavItem
            type="type-anchor-link"
            label={navItem.label}
            on:click={() => {
              sectionRefs[navItem.id]?.scrollIntoView()
            }}
          />
        {/each}
      </div>
      <Separator name="spaceTypeEditor" index={0} color="transparent" />
    {/if}
    {#if editorDescriptor !== undefined}
      <div class="hulyComponent-content__column content">
        <Scroller align="center" padding="var(--spacing-3)" bottomPadding="var(--spacing-3)">
          <div class="hulyComponent-content gap">
            {#each editorDescriptor.sections as section}
              <div bind:this={sectionRefs[section.id]} class:hulyTableAttr-container={!section.withoutContainer}>
                <Component
                  is={section.component}
                  disabled={readonly}
                  props={{
                    type,
                    descriptor
                  }}
                />
              </div>
            {/each}
          </div>
        </Scroller>
      </div>
    {/if}
  </div>
{/if}
