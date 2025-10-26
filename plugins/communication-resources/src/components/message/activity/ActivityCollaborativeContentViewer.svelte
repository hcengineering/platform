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
  import { ActivityCollaborativeChange } from '@hcengineering/communication-types'
  import { MarkupDiffPresenter } from '@hcengineering/view-resources'
  import activity from '@hcengineering/activity'
  import ui, { Label } from '@hcengineering/ui'
  import { AttributeModel } from '@hcengineering/view'
  import communication from '../../../plugin'

  export let model: AttributeModel | undefined = undefined
  export let update: ActivityCollaborativeChange

  $: isTooLarge = update.value === activity.string.ValueTooLarge || update.prevValue === activity.string.ValueTooLarge

  let isDiffShown = false

  function toggleShowMore (): void {
    isDiffShown = !isDiffShown
  }
</script>

<div>
  {#if model !== undefined}
    <Label label={model.label} />
    <span class="lower"><Label label={activity.string.Edited} /></span>
  {/if}
  {#if isTooLarge}
    <div class="unset row overflow-label">
      <Label label={activity.string.ValueTooLarge} />
    </div>
  {:else}
    <div class="showMore" on:click={toggleShowMore}>
      <div class="triangle" class:left={!isDiffShown} class:down={isDiffShown} />
      <Label label={isDiffShown ? ui.string.ShowLess : ui.string.ShowMore} />
    </div>
  {/if}
</div>
{#if isDiffShown}
  <MarkupDiffPresenter value={update.value} prevValue={update.prevValue} />
{/if}

<style lang="scss">
  .showMore {
    color: var(--global-primary-LinkColor);
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
        border-left: 0.25rem solid var(--global-primary-LinkColor);
        border-right: none;
      }

      &.down {
        border-left: 0.25rem solid transparent;
        border-right: 0.25rem solid transparent;
        border-top: 0.25rem solid var(--global-primary-LinkColor);
        border-bottom: none;
      }
    }

    &:hover {
      color: var(--global-focus-BorderColor);

      .triangle {
        &.left {
          border-left-color: var(--global-focus-BorderColor);
        }

        &.down {
          border-top-color: var(--global-focus-BorderColor);
        }
      }
    }
  }
</style>
