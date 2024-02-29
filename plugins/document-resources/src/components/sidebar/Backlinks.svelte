<!--
//
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
//
-->
<script lang="ts">
  import chunter, { Backlink } from '@hcengineering/chunter'
  import { Ref } from '@hcengineering/core'
  import { Document } from '@hcengineering/document'
  import { createQuery } from '@hcengineering/presentation'
  import { Label, Lazy, Scroller } from '@hcengineering/ui'

  import document from '../../plugin'
  import BacklinkView from './BacklinkView.svelte'

  export let doc: Ref<Document>

  const query = createQuery()

  let backlinks: Backlink[] = []

  $: query.query(
    chunter.class.Backlink,
    {
      attachedTo: doc
    },
    (res) => {
      backlinks = res
    }
  )
</script>

<div class="h-full flex-col clear-mins">
  <div class="header">
    <div class="title"><Label label={document.string.Backlinks} /></div>
  </div>

  <div class="divider" />

  {#if backlinks.length > 0}
    <Scroller>
      {#each backlinks as backlink}
        <Lazy>
          <BacklinkView value={backlink} />
        </Lazy>
      {/each}
    </Scroller>
  {:else}
    <div class="flex-col justify-center flex-grow text-center">
      <div class="label nowrap fs-bold">
        <Label label={document.string.NoBacklinks} />
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1.25rem;
    height: 3rem;
    min-height: 3rem;
    border-bottom: 1px solid var(--theme-divider-color);

    .title {
      flex-grow: 1;
      font-weight: 500;
      color: var(--caption-color);
      user-select: none;
    }
  }
</style>
