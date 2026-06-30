<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import type { ReferenceVersion } from '@hcengineering/view'
  import { Label, Scroller, resizeObserver } from '@hcengineering/ui'

  import textEditor from '../plugin'

  export let latest: ReferenceVersion
  export let versions: Promise<ReferenceVersion[]>
  export let onSelect: (props: ReferenceVersion) => void

  const dispatch = createEventDispatcher()

  function selectLatest (): void {
    onSelect(latest)
    dispatch('close')
  }

  function selectVersion (version: ReferenceVersion): void {
    onSelect(version)
    dispatch('close')
  }
</script>

<div class="selectPopup dropdown" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <Scroller>
    <button class="px-1 py-2 menu-item" on:click={selectLatest}>
      <div class="w-full flex-between">
        <div class="mr-2 ml-4 flex-row-center">
          <span class="title mr-1-5">{latest.label}</span>
          <span class="version mr-1-5"><Label label={textEditor.string.LatestVersion} /></span>
        </div>
      </div>
    </button>

    {#await versions then versionItems}
      {#if versionItems.length > 0}
        <div class="menu-separator" />
        {#each versionItems as version}
          <button
            class="px-1 py-2 menu-item"
            on:click={() => {
              selectVersion(version)
            }}
          >
            <div class="w-full flex-between">
              <div class="mr-2 ml-4 flex-row-center">
                <span class="title mr-1-5">{version.label}</span>
              </div>
            </div>
          </button>
        {/each}
      {/if}
    {/await}
  </Scroller>
  <div class="menu-space" />
</div>

<style lang="scss">
  .dropdown {
    min-width: 25rem;
  }

  .title {
    white-space: nowrap;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .version {
    font-weight: 500;
    opacity: 0.6;
  }
</style>
