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
  import { type Card } from '@hcengineering/card'
  import { type WithLookup } from '@hcengineering/core'
  import { getClient, Image, remToPx } from '@hcengineering/presentation'
  import { Button, IconMoreH } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { openDoc, PersonIdPresenter, showMenu, TimestampPresenter } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'

  import card from '../plugin'
  import CardIcon from './CardIcon.svelte'
  import CardPresenter from './CardPresenter.svelte'

  export let object: WithLookup<Card>
  export let selected: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()
  const size = remToPx(20)

  let hovered = false

  $: isFile = hierarchy.isDerived(object._class, card.types.File)
  $: mainBlob = Object.values(object.blobs ?? {})[0]
  $: isImage = mainBlob?.type?.startsWith('image/')
  $: previewRef = mainBlob?.file
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="card-container"
  class:selected
  class:hovered
  draggable="false"
  on:mouseover={() => dispatch('obj-focus', object)}
  on:mouseenter={() => dispatch('obj-focus', object)}
  on:focus={() => {}}
  on:contextmenu={(evt) => {
    showMenu(evt, { object })
  }}
>
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="card"
    on:click={() => {
      void openDoc(hierarchy, object)
    }}
  >
    <div class="card-content" class:is-file={isFile}>
      {#if isFile && previewRef && isImage}
        <Image
          blob={previewRef}
          alt={object.title}
          width={size}
          height={size}
          blurhash={mainBlob?.metadata?.thumbnail?.blurhash}
          responsive
          fit={'cover'}
        />
      {:else if isFile && mainBlob}
        <div class="flex-center ext-icon">
          {mainBlob.name.split('.').pop()?.substring(0, 4).toUpperCase()}
        </div>
      {:else}
        <CardIcon value={object} size={'full'} />
      {/if}
    </div>

    <div class="header flex-col">
      <div class="flex-row-center flex-gap-2 h-8">
        <div class="title overflow-label flex-grow font-medium-14">
          <CardPresenter value={object} type={'text'} />
        </div>
        <div class="tools">
          <Button
            icon={IconMoreH}
            kind="ghost"
            size="medium"
            showTooltip={{ label: view.string.MoreActions, direction: 'bottom' }}
            on:click={(evt) => {
              hovered = true
              showMenu(evt, { object }, () => {
                hovered = false
              })
            }}
          />
        </div>
      </div>

      <div class="flex-between flex-gap-2 h-4 mt-2">
        <PersonIdPresenter value={object.createdBy} withPadding={false} noUnderline avatarSize="tiny" />
        <span class="flex-no-shrink caption-color">
          <TimestampPresenter value={object.createdOn ?? object.modifiedOn} />
        </span>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .card-container {
    position: relative;
    border-radius: 0.75rem;
    border: 1px solid var(--theme-divider-color);
    background-color: var(--theme-kanban-card-bg-color);
    overflow: hidden;
    transition: all 0.2s ease-in-out;
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.05),
      0 2px 4px -1px rgba(0, 0, 0, 0.03);

    &:hover {
      box-shadow:
        0 10px 15px -3px rgba(0, 0, 0, 0.08),
        0 4px 6px -2px rgba(0, 0, 0, 0.04);
      border-color: var(--theme-border-color-dark);
      transform: translateY(-2px);
    }

    &.selected {
      outline: 2px solid var(--global-focus-BorderColor);
      outline-offset: 2px;
      background-color: var(--highlight-hover);
    }

    &:hover,
    &.hovered {
      .tools {
        display: block;
      }
    }
  }

  .card {
    cursor: pointer;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .tools {
    display: none;
    background: var(--theme-kanban-card-bg-color);
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .card-content {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 11rem;
    background: linear-gradient(180deg, var(--theme-border-color-light) 0%, var(--theme-divider-color) 100%);
    position: relative;

    &.is-file {
      background: var(--theme-bg-color-alt);
    }
  }

  .header {
    border-top: 1px solid var(--theme-divider-color);
    padding: 0.25rem 0.75rem 0.75rem 0.75rem;
    background-color: var(--theme-kanban-card-bg-color);
  }

  .title {
    color: var(--theme-text-color);
    line-height: 1.25rem;
  }

  .ext-icon {
    flex-shrink: 0;
    width: 3rem;
    height: 3rem;
    font-weight: 600;
    font-size: 0.75rem;
    color: var(--primary-button-color);
    background-color: var(--primary-button-default);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.5rem;
  }
</style>
