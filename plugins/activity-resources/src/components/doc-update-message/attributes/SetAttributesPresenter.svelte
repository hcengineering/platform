<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import ui, { Icon, Label, IconEdit } from '@hcengineering/ui'
  import { AttributeModel } from '@hcengineering/view'
  import core from '@hcengineering/core'
  import activity, { DocAttributeUpdates, DocUpdateMessageViewlet } from '@hcengineering/activity'

  import ChangeAttributesTemplate from './ChangeAttributesTemplate.svelte'

  export let viewlet: DocUpdateMessageViewlet | undefined
  export let attributeModel: AttributeModel
  export let values: DocAttributeUpdates['set']
  export let prevValue: any

  $: attrViewletConfig = viewlet?.config?.[attributeModel.key]
  $: attributeIcon = attrViewletConfig?.icon ?? attributeModel.icon ?? IconEdit
  $: isUnset = values.length > 0 && !values.some((value) => value !== null && value !== '')

  $: isTextType = getIsTextType(attributeModel)

  function getIsTextType (attributeModel: AttributeModel): boolean {
    return (
      attributeModel.attribute?.type?._class === core.class.TypeMarkup ||
      attributeModel.attribute?.type?._class === core.class.TypeCollaborativeMarkup
    )
  }

  let isDiffShown = false

  function toggleShowMore (): void {
    isDiffShown = !isDiffShown
  }
</script>

{#if isUnset}
  <div class="unset">
    <span class="mr-1"><Icon icon={attributeIcon} size="small" /></span>
    <Label label={activity.string.Unset} />
    <span class="lower"><Label label={attributeModel.label} /></span>
  </div>
{:else if isTextType}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="showMore" on:click={toggleShowMore}>
    <div class="triangle" class:left={!isDiffShown} class:down={isDiffShown} />
    <Label label={isDiffShown ? ui.string.ShowLess : ui.string.ShowMore} />
  </div>
  {#if isDiffShown}
    <svelte:component this={attributeModel.presenter} value={values[0]} {prevValue} showOnlyDiff />
  {/if}
{:else}
  <ChangeAttributesTemplate {viewlet} {attributeModel} {values}>
    <svelte:fragment slot="text">
      <Label label={attributeModel.label} />
      <span class="lower"><Label label={activity.string.Set} /></span>
      <span class="lower"><Label label={activity.string.To} /></span>
    </svelte:fragment>
  </ChangeAttributesTemplate>
{/if}

<style lang="scss">
  .unset {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .showMore {
    color: var(--theme-link-color);
    cursor: pointer;
    display: flex;
    align-items: center;
    font-weight: 500;
    gap: 0.5rem;

    .triangle {
      width: 0;
      height: 0;

      &.left {
        border-top: 0.25rem solid transparent;
        border-bottom: 0.25rem solid transparent;
        border-left: 0.25rem solid var(--theme-link-color);
        border-right: none;
      }

      &.down {
        border-left: 0.25rem solid transparent;
        border-right: 0.25rem solid transparent;
        border-top: 0.25rem solid var(--theme-link-color);
        border-bottom: none;
      }
    }

    &:hover {
      color: var(--theme-toggle-on-bg-hover);

      .triangle {
        &.left {
          border-left-color: var(--theme-toggle-on-bg-hover);
        }

        &.down {
          border-top-color: var(--theme-toggle-on-bg-hover);
        }
      }
    }
  }
</style>
