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
  import {
    ModernPopup,
    IconDelete,
    ButtonIcon,
    IconMoreV,
    IconMoreV2,
    showPopup,
    eventToHTMLElement,
    ModernEditbox
  } from '@hcengineering/ui'
  import type { DropdownIntlItem } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import setting from '../plugin'

  export let values: string[]
  export let disableMouseOver: boolean = false

  let selected: string | undefined
  let opened: number | undefined = undefined
  const elements: HTMLElement[] = []

  function dragswap (ev: MouseEvent, item: string): boolean {
    const s = values.findIndex((p) => p === selected)
    const i = values.findIndex((p) => p === item)
    if (i < s) {
      return ev.offsetY < elements[i].offsetHeight / 2
    } else if (i > s) {
      return ev.offsetY > elements[i].offsetHeight / 2
    }
    return false
  }

  function dragover (ev: MouseEvent, item: string) {
    const s = values.findIndex((p) => p === selected)
    const i = values.findIndex((p) => p === item)
    if (dragswap(ev, item)) {
      ;[values[i], values[s]] = [values[s], values[i]]
    }
  }

  const dispatch = createEventDispatcher()

  async function remove (target: string) {
    dispatch('remove', target)
  }

  async function onDrop () {
    dispatch('drop')
  }

  const items: (DropdownIntlItem & { action: () => void })[] = [
    {
      id: 'delete',
      icon: IconDelete,
      label: setting.string.Delete,
      action: () => {
        if (opened !== undefined) {
          remove(values[opened])
          opened = undefined
        }
      }
    }
  ]

  function openPopup (ev: MouseEvent, n: number) {
    if (opened === undefined) {
      opened = n
      showPopup(ModernPopup, { items }, eventToHTMLElement(ev), (result) => {
        if (result) {
          switch (result) {
            case 'delete':
              remove(values[n])
              break
          }
        }
        opened = undefined
      })
    }
  }

  const handleKeydown = (evt: KeyboardEvent): void => {
    if (evt.key === 'Enter') {
      update()
    }
    if (evt.key === 'Escape') {
      evt.stopPropagation()
    }
  }

  function update (): void {
    dispatch('update', values)
  }
</script>

{#each values as item, i}
  <button
    bind:this={elements[i]}
    draggable={!disableMouseOver}
    class="hulyTableAttr-content__row"
    class:disableMouseOver
    class:hovered={opened === i && !disableMouseOver}
    class:selected={selected === item}
    on:dragover|preventDefault={(ev) => {
      dragover(ev, item)
    }}
    on:drop|preventDefault={onDrop}
    on:dragstart={() => {
      selected = item
    }}
    on:dragend={() => {
      selected = undefined
    }}
  >
    <button class="hulyTableAttr-content__row-dragMenu" class:drag={!disableMouseOver}>
      <IconMoreV2 size={'small'} />
    </button>
    <div class="hulyTableAttr-content__row-label font-regular-14 accent">
      <ModernEditbox
        kind={'ghost'}
        size={'small'}
        label={setting.string.EnterOptionTitle}
        on:keydown={handleKeydown}
        on:blur={() => {
          update()
        }}
        bind:value={values[i]}
        width={'100%'}
      />
    </div>
    <div class="hulyTableAttr-content__row-label grow" />
    {#if !disableMouseOver}
      <ButtonIcon
        kind={'tertiary'}
        icon={IconMoreV}
        iconProps={{ fill: 'var(--global-tertiary-TextColor)' }}
        size={'small'}
        pressed={opened === i}
        hasMenu
        on:click={(ev) => {
          openPopup(ev, i)
        }}
      />
    {/if}
  </button>
{/each}

<style lang="scss">
  .item {
    padding: 0.5rem 0.5rem 0.5rem 0.125rem;
    height: 2.25rem;
    background-color: var(--theme-button-default);
    border-radius: 0.25rem;

    .circles-mark {
      position: relative;
      width: 1rem;
      height: 1rem;
      opacity: 0.4;
      transition: opacity 0.1s;
      cursor: grab;

      &::before {
        position: absolute;
        content: '';
        inset: -0.5rem;
      }
    }
    &:hover {
      background-color: var(--theme-button-hovered);

      .circles-mark {
        cursor: grab;
        opacity: 1;
      }
    }
    &:active {
      background-color: var(--theme-button-pressed);
    }
  }
</style>
