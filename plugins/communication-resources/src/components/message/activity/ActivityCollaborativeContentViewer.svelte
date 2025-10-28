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
  import activity from '@hcengineering/activity'
  import { ActivityCollaborativeChange } from '@hcengineering/communication-types'
  import ui, { Label } from '@hcengineering/ui'
  import { AttributeModel } from '@hcengineering/view'
  import { MarkupDiffPresenter } from '@hcengineering/view-resources'

  export let model: AttributeModel | undefined = undefined
  export let update: ActivityCollaborativeChange
  export let oneRow: boolean = false

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
  {#if !oneRow}
    {#if isTooLarge}
      <Label label={activity.string.ValueTooLarge} />
    {:else}
      <span class="showMore" on:click={toggleShowMore}>
        <Label label={isDiffShown ? ui.string.ShowLess : ui.string.ShowMore} />
      </span>
    {/if}
  {/if}
</div>
{#if isDiffShown}
  <MarkupDiffPresenter value={update.value} prevValue={update.prevValue} />
{/if}

<style lang="scss">
  .showMore {
    color: var(--global-primary-LinkColor);
    cursor: pointer;
    font-weight: 500;

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
