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
  import core, { type WithLookup } from '@hcengineering/core'
  import { type Resource } from '@hcengineering/drive'
  import { getClient } from '@hcengineering/presentation'
  import { Button, IconMoreH } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { ObjectPresenter, TimestampPresenter, openDoc, showMenu } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'

  import FileSizePresenter from './FileSizePresenter.svelte'
  import ResourcePresenter from './ResourcePresenter.svelte'
  import Thumbnail from './Thumbnail.svelte'

  export let object: WithLookup<Resource>
  export let selected: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  $: version = object.$lookup?.file

  let hovered = false
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
    <div class="card-content">
      <Thumbnail {object} size={'x-large'} />
    </div>

    <div class="header flex-col p-2 pt-1">
      <div class="flex-row-center flex-gap-2 h-8">
        <div class="title overflow-label flex-grow">
          <ResourcePresenter value={object} shouldShowAvatar={false} accent />
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

      <div class="flex-between flex-gap-2 h-4">
        <div class="flex-row-center flex-gap-2 font-regular-12">
          <!-- TODO: FIXME -->
          <!-- <ObjectPresenter
            _class={core.class.Account}
            objectId={object.createdBy}
            noUnderline
            props={{ avatarSize: 'tiny' }}
          /> -->
          <span>•</span>
          <span class="flex-no-shrink">
            <TimestampPresenter value={version?.lastModified ?? object.createdOn ?? object.modifiedOn} />
          </span>
        </div>
        <div class="flex-no-shrink font-regular-12">
          <FileSizePresenter value={version?.size} />
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .card-container {
    position: relative;

    border-radius: 0.5rem;
    border: 1px solid var(--theme-divider-color);
    background-color: var(--theme-kanban-card-bg-color);

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
    border-radius: 0.5rem;
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
  }

  .tools {
    display: none;
  }

  .card-content {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 10rem;
  }

  .header {
    border-top: 1px solid var(--theme-divider-color);
    padding: 0.25rem 0.5rem 0.5rem;
  }
</style>
