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
  import { ObjectBox } from '@hcengineering/view-resources'
  import { AnyComponent, ButtonIcon, Icon, IconAdd, IconDelete, Label } from '@hcengineering/ui'
  import setting from '@hcengineering/setting'
  import view, { ViewletDescriptor } from '@hcengineering/view'
  import { Doc, Ref, Space, generateId } from '@hcengineering/core'
  import DescriptorBox from './DescriptorBox.svelte'
  import card from '../../../plugin'
  import { MasterTag, Tag } from '@hcengineering/card'

  export let tag: MasterTag | Tag

  // Define the ViewConfig interface
  interface ViewConfig {
    class: Ref<Doc<Space>> | undefined
    view?: Ref<ViewletDescriptor>
    id?: string // Unique identifier for each config
  }

  export let viewConfigs: ViewConfig[] = [
    {
      class: tag._id,
      view: view.viewlet.Tree,
      id: generateId()
    },
    {
      class: tag._id,
      view: view.viewlet.Document,
      id: generateId()
    }
  ]
  export let sectionIcon: string = setting.icon.Views

  const dispatch = createEventDispatcher()

  // Function to add a new view configuration
  function addViewConfig (): void {
    // Create a new ViewConfig with default empty values and unique ID
    const newViewConfig: ViewConfig = {
      class: tag._id,
      id: generateId()
    }

    viewConfigs = [...viewConfigs, newViewConfig]
    dispatch('change', { viewConfigs })
  }

  function updateViewClass (index: number, value: Ref<Doc<Space>>): void {
    viewConfigs[index].class = value
    viewConfigs = [...viewConfigs] // Trigger reactivity
    dispatch('change', { viewConfigs })
  }

  function updateViewConfig (index: number, value: Ref<ViewletDescriptor>): void {
    viewConfigs[index].view = value
    viewConfigs = [...viewConfigs] // Trigger reactivity
    dispatch('change', { viewConfigs })
  }

  // Function to remove a view configuration
  function removeViewConfig (index: number): void {
    viewConfigs = viewConfigs.filter((_, i) => i !== index)
    dispatch('change', { viewConfigs })
  }


</script>

<div class="hulyTableAttr-container">
  <div class="hulyTableAttr-header font-medium-12">
    <Icon icon={sectionIcon} size="small" />
    <span><Label label={card.string.MasterDetailViews} /></span>
    <ButtonIcon kind="primary" icon={IconAdd} size="small" dataId={'btnAddViewConfig'} on:click={addViewConfig} />
  </div>

  {#if viewConfigs.length > 0}
    <div class="hulyTableAttr-content task">
      {#each viewConfigs as config, index}
        <div class="config-row">
          <div class="config-inputs">
            <div class="config-input">
              <ObjectBox
                label={card.string.SelectType}
                _class={card.class.MasterTag}
                value={config.class}
                on:change={(e) => { updateViewClass(index, e.detail) }}
              />
            </div>
            <div class="config-input">
              <DescriptorBox
                label={card.string.SelectViewType}
                value={config.view}
                withSingleViews
                on:change={(e) => { updateViewConfig(index, e.detail) }}
              />
            </div>
          </div>
          <ButtonIcon
            kind={'tertiary'}
            icon={IconDelete}
            size="small"
            on:click={() => { removeViewConfig(index) }}
          />
          <ButtonIcon
            icon="times"
            size="small"
            kind="ghost"
            on:click={() => { removeViewConfig(index) }}
          />
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <p>No view configurations added yet. Click the + button to add one.</p>
    </div>
  {/if}
</div>

<style>
  .config-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    border-bottom: 1px solid #e0e4e8;
    width: 100%;
  }

  .config-inputs {
    display: flex;
    gap: 1rem;
    flex: 1;
  }

  .config-input {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .empty-state {
    padding: 1rem;
    text-align: center;
    color: #5d6b82;
    font-style: italic;
  }
</style>
