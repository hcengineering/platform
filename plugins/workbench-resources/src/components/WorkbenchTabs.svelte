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
  import { createTab, tabsStore } from '../workbench'
  import WorkbenchTabPresenter from './WorkbenchTabPresenter.svelte'
  import { IconAdd, ButtonIcon } from '@hcengineering/ui'
</script>

<div class="root flex-gap-1">
  {#each $tabsStore as tab}
    <WorkbenchTabPresenter {tab} />
  {/each}
  <div class="ml-1-5 plus-button mr-1">
    <ButtonIcon icon={IconAdd} size="min" kind="tertiary" on:click={createTab} />
  </div>
</div>

<style>
  .root {
    display: flex;
    align-items: center;
  }
  .plus-button {
    height: 0.875rem;
  }
</style>
