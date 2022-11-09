<!-- 
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Doc, DocumentQuery } from '@hcengineering/core'
  import presentation, { createQuery } from '@hcengineering/presentation'
  import { IssueTemplate } from '@hcengineering/tracker'
  import { Label, Spinner } from '@hcengineering/ui'
  import tracker from '../../../plugin'
  import IssueTemplatePresenter from '../../templates/IssueTemplatePresenter.svelte'

  export let object: Doc

  let templates: IssueTemplate[] = []

  let query: DocumentQuery<IssueTemplate>
  $: query = { 'relations._id': object._id, 'relations._class': object._class }

  const templatesQ = createQuery()
  $: templatesQ.query(tracker.class.IssueTemplate, query, async (result) => (templates = result))
</script>

<div class="mt-1">
  {#if templates !== undefined}
    {#if templates.length > 0}
      {#each templates as template}
        <div class="flex-between row p-3">
          <IssueTemplatePresenter value={template} />
        </div>
      {/each}
    {:else}
      <div class="p-1">
        <Label label={presentation.string.NoMatchesFound} />
      </div>
    {/if}
  {:else}
    <div class="flex-center pt-3">
      <Spinner />
    </div>
  {/if}
</div>

<style lang="scss">
  .row {
    position: relative;
    border-bottom: 1px solid var(--divider-color);
  }
</style>
