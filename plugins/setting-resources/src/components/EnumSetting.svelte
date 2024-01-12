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
  import { createEventDispatcher } from 'svelte'
  import core, { Enum } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    CircleButton,
    EditBox,
    eventToHTMLElement,
    IconAdd,
    IconMoreH,
    Label,
    showPopup,
    Header,
    Breadcrumb,
    defineSeparators,
    settingsSeparators,
    Separator,
    Scroller
  } from '@hcengineering/ui'
  import { ContextMenu } from '@hcengineering/view-resources'
  import setting from '../plugin'
  import EnumValues from './EnumValues.svelte'

  export let visibleNav: boolean = true

  const dispatch = createEventDispatcher()

  const query = createQuery()

  let enums: Enum[] = []
  let selected: Enum | undefined
  let hovered: number | null = null
  const client = getClient()

  query.query(core.class.Enum, {}, (res) => {
    enums = res
    if (selected !== undefined) {
      selected = enums.find((p) => p._id === selected?._id)
    }
  })

  function create () {
    showPopup(setting.component.EditEnum, {}, 'top')
  }

  async function update (value: Enum): Promise<void> {
    await client.update(value, {
      name: value.name
    })
  }
  defineSeparators('workspaceSettings', settingsSeparators)
</script>

<div class="hulyComponent">
  <Header minimize={!visibleNav} on:resize={(event) => dispatch('change', event.detail)}>
    <Breadcrumb icon={setting.icon.Enums} label={setting.string.Enums} size={'large'} isCurrent />
  </Header>
  <div class="hulyComponent-content__container columns">
    <div class="hulyComponent-content__column">
      <div class="flex-between trans-title m-3">
        <Label label={setting.string.Enums} />
        <CircleButton icon={IconAdd} size="medium" on:click={create} />
      </div>
      <div class="overflow-y-auto">
        {#each enums as value, i}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            class="enum__list-item"
            class:hovered={hovered === i}
            class:selected={selected === value}
            on:click={() => {
              selected = value
            }}
          >
            <EditBox bind:value={value.name} on:change={() => update(value)} />
            <div
              class="hover-trans"
              on:click|stopPropagation={(ev) => {
                hovered = i
                showPopup(ContextMenu, { object: value }, eventToHTMLElement(ev), () => {
                  hovered = null
                })
              }}
            >
              <IconMoreH size={'medium'} />
            </div>
          </div>
        {/each}
      </div>
    </div>
    <Separator name={'workspaceSettings'} index={0} color={'var(--theme-divider-color)'} />
    <div class="hulyComponent-content__column content">
      <Scroller align={'center'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
        <div class="hulyComponent-content">
          {#if selected !== undefined}
            <EnumValues value={selected} />
          {/if}
        </div>
      </Scroller>
    </div>
  </div>
</div>

<style lang="scss">
  .enum__list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 2.5rem;
    margin: 0 0.75rem;
    padding: 0 1.25rem;
    border: 1px solid transparent;
    border-radius: 12px;
    cursor: pointer;

    &.hovered,
    &:hover {
      background-color: var(--theme-button-hovered);
    }
    &.selected {
      background-color: var(--theme-button-default);
      border-color: var(--theme-button-border);
      cursor: auto;
    }
  }
</style>
