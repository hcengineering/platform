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
  import { ButtonIcon, Icon, IconAdd, IconDelete, Label } from '@hcengineering/ui'
  import setting from '@hcengineering/setting'
  import view, { ViewletDescriptor } from '@hcengineering/view'
  import { Doc, Ref, Space, generateId } from '@hcengineering/core'
  import DescriptorBox from './DescriptorBox.svelte'
  import card from '../../../plugin'
  import { MasterTag, Tag } from '@hcengineering/card'
  import { MasterDetailConfig } from '@hcengineering/view'
  import RelatedTagSelect from './RelatedTagSelect.svelte'

  export let tag: MasterTag | Tag

  export let viewConfigs: MasterDetailConfig[]
  export let sectionIcon: string = setting.icon.Views

  const dispatch = createEventDispatcher()

  // Function to add a new view configuration
  function addViewConfig (): void {
    // Create a new ViewConfig with default empty values and unique ID
    const newViewConfig: MasterDetailConfig = {
      class: tag._id,
      id: generateId()
    }

    viewConfigs = [...viewConfigs, newViewConfig]
    dispatch('change', viewConfigs)
  }

  function updateViewClass (index: number, value: Ref<Doc<Space>>): void {
    viewConfigs[index].class = value
    viewConfigs = [...viewConfigs] // Trigger reactivity
    dispatch('change', viewConfigs)
  }

  function updateViewConfig (index: number, value: Ref<ViewletDescriptor>): void {
    viewConfigs[index].view = value
    viewConfigs = [...viewConfigs] // Trigger reactivity
    dispatch('change', viewConfigs)
  }

  // Function to remove a view configuration
  function removeViewConfig (index: number): void {
    viewConfigs = viewConfigs.filter((_, i) => i !== index)
    dispatch('change', viewConfigs)
  }


</script>

<div class="hulyTableAttr-container">
  <div class="hulyTableAttr-header font-medium-12">
    <Icon icon={sectionIcon} size="small" />
    <span><Label label={card.string.MasterDetailViews} /></span>
    <ButtonIcon kind="primary" icon={IconAdd} size="small" dataId={'btnAddViewConfig'} on:click={addViewConfig} />
  </div>

  {#if viewConfigs.length > 0}
      {#each viewConfigs as config, index}
        <div class="hulyTableAttr-content task">
          <div class="hulyTableAttr-content__row justify-between">
            <div class="config-input">
              <RelatedTagSelect
                label={card.string.SelectType}
                tag={index > 0 ? viewConfigs[index - 1].class : tag._id}
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
            <div class="config-input">
              <ButtonIcon
                kind={'tertiary'}
                icon={IconDelete}
                size="small"
                disabled={viewConfigs.length === 1}
                on:click={() => { removeViewConfig(index) }}
              />
            </div>
          </div>
        </div>
      {/each}
  {/if}
</div>

