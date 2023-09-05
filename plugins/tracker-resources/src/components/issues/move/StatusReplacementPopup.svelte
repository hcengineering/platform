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
  import { createEventDispatcher } from 'svelte'

  import { IssueStatus, Project } from '@hcengineering/tracker'
  import tracker from '../../../plugin'
  import { StatusPresenter } from '@hcengineering/view-resources'
  import { Ref } from '@hcengineering/core'
  import { Icon, IconCheck, Label, Scroller } from '@hcengineering/ui'

  import IssueStatusIcon from '../IssueStatusIcon.svelte'

  export let statuses: IssueStatus[] | undefined
  export let original: IssueStatus | undefined
  export let selected: Ref<IssueStatus>
  export let space: Ref<Project>

  const dispatch = createEventDispatcher()
</script>

{#if statuses !== undefined}
  <div class="selectPopup">
    <div class="menu-space" />
    <Scroller>
      <span class="ml-4">
        <Label label={tracker.string.Replacement} />
      </span>
      <div class="scroll">
        <div class="box">
          {#each statuses as status}
            <button
              class="menu-item no-focus content-pointer-events-none"
              on:click={() => {
                selected = status._id
                dispatch('close', status._id)
              }}
            >
              <div class="flex-between w-full">
                <div class="flex-row-center">
                  <div class="pr-2">
                    <IssueStatusIcon value={status} size={'small'} {space} />
                  </div>
                  <StatusPresenter value={status} />
                </div>
                <div class="pointer-events-none">
                  {#if selected === status._id}
                    <Icon icon={IconCheck} size={'small'} />
                  {/if}
                </div>
              </div>
            </button>
          {/each}

          {#if original !== undefined}
            <div class="divider mb-4" />
            <div class="ml-4">
              <Label label={tracker.string.Original} />
            </div>
            <div class="min-width ml-4">
              <Label label={tracker.string.OriginalDescription} />
            </div>
            <button
              class="menu-item no-focus content-pointer-events-none"
              on:click={() => {
                if (original !== undefined) {
                  selected = original._id
                  dispatch('close', { create: original._id })
                }
              }}
            >
              <div class="flex-between w-full">
                <div class="flex-row-center">
                  <div class="pr-2">
                    <IssueStatusIcon value={original} size={'small'} {space} />
                  </div>
                  <StatusPresenter value={original} />
                </div>
                <div class="pointer-events-none">
                  {#if selected === original._id}
                    <Icon icon={IconCheck} size={'small'} />
                  {/if}
                </div>
              </div>
            </button>
          {/if}
        </div>
      </div>
    </Scroller>
    <div class="menu-space" />
  </div>
{/if}

<style lang="scss">
  .divider {
    border-bottom: 1px solid var(--theme-divider-color);
  }
</style>
