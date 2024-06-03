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
  import { ControlledDocument } from '@hcengineering/controlled-documents'
  import { IconCheck } from '@hcengineering/ui'
  import StatePresenter from './document/presenters/StatePresenter.svelte'
  import { getDocumentVersionString } from '../utils'

  export let doc: ControlledDocument
  export let isCurrent: boolean
  export let onClick: () => void
</script>

<button class="px-1 py-2 menu-item" on:click={onClick}>
  <div class="w-full flex-between">
    <div class="mr-2 ml-4 flex-row-center">
      <span class="title mr-1-5">{doc.title}</span>
      <span class="version mr-1-5">
        {getDocumentVersionString(doc)}
      </span>
      <StatePresenter value={doc} />
    </div>
    <span class="icon mr-4">
      {#if isCurrent}
        <IconCheck size="small" fill="var(--theme-popup-checkicon)" />
      {/if}
    </span>
  </div>
</button>

<style lang="scss">
  .icon {
    width: 1rem;
    min-width: 1rem;
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
