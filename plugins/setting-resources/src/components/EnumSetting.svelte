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
  import core, { Enum } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import {
    Breadcrumb,
    ButtonIcon,
    Header,
    IconAdd,
    IconMoreH,
    IconTableOfContents,
    Label,
    ModernButton,
    Scroller,
    Separator,
    defineSeparators,
    twoPanelsSeparators,
    showPopup
  } from '@hcengineering/ui'
  import { showMenu } from '@hcengineering/view-resources'
  import setting from '../plugin'
  import EnumValues from './EnumValues.svelte'

  const query = createQuery()

  let enums: Enum[] = []
  let selected: Enum | undefined
  let hovered: number | null = null

  query.query(core.class.Enum, {}, (res) => {
    enums = res
    if (selected !== undefined) {
      selected = enums.find((p) => p._id === selected?._id)
    }
  })

  function create () {
    showPopup(setting.component.EditEnum, { title: setting.string.CreateEnum }, 'top')
  }

  defineSeparators('workspaceSettings', twoPanelsSeparators)
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={setting.icon.Enums} label={setting.string.Enums} size={'large'} isCurrent />
    <svelte:fragment slot="actions">
      <ModernButton
        kind={'primary'}
        icon={IconAdd}
        label={setting.string.CreateEnum}
        size={'small'}
        on:click={create}
      />
    </svelte:fragment>
  </Header>
  <div class="hulyComponent-content__container columns">
    <div class="hulyComponent-content__column">
      <div class="hulyComponent-content__navHeader">
        <div class="hulyComponent-content__navHeader-menu">
          <ButtonIcon kind={'tertiary'} icon={IconTableOfContents} size={'small'} inheritColor />
        </div>
        <div class="hulyComponent-content__navHeader-hint paragraph-regular-14">
          <Label label={setting.string.EnumsSettingHint} />
        </div>
      </div>
      <Scroller>
        {#each enums as value, i}
          <button
            class="enum__list-item"
            class:hovered={hovered === i}
            class:selected={selected === value}
            on:click={() => {
              selected = value
            }}
          >
            <div class="flex-col">
              <span class="font-regular-14 overflow-label">{value.name}</span>
              <span class="font-regular-12 secondary-textColor overflow-label">
                <Label label={setting.string.EnumsCount} params={{ count: value.enumValues.length }} />
              </span>
            </div>
            <ButtonIcon
              kind={'tertiary'}
              icon={IconMoreH}
              size={'small'}
              pressed={hovered === i}
              on:click={(ev) => {
                hovered = i
                showMenu(ev, { object: value }, () => {
                  hovered = null
                })
              }}
            />
          </button>
        {/each}
      </Scroller>
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
    margin: 0 var(--spacing-1_5);
    padding: var(--spacing-1) var(--spacing-1_25);
    text-align: left;
    border: none;
    border-radius: var(--small-BorderRadius);
    outline: none;

    & :global(button.type-button-icon) {
      visibility: hidden;
    }
    &.hovered,
    &:hover {
      background-color: var(--theme-button-hovered);

      & :global(button.type-button-icon) {
        visibility: visible;
      }
    }
    &.selected {
      background-color: var(--theme-button-default);
      cursor: default;
    }
  }
</style>
