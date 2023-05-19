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
  import { Ref } from '@hcengineering/core'
  import { TagElement } from '@hcengineering/tags'
  import TagFilterPresenter from './TagFilterPresenter.svelte'
  import { createQuery } from '@hcengineering/presentation'
  import tags from '../plugin'
  import CollapsedTags from './CollapsedTags.svelte'

  export let value: Ref<TagElement>[]

  let values: TagElement[] = []
  const query = createQuery()
  query.query(tags.class.TagElement, { _id: { $in: value } }, (res) => {
    values = res
  })
</script>

{#if values.length < 4}
  <div class="flex flex-gap-1">
    {#each values as val}
      <TagFilterPresenter value={val} />
    {/each}
  </div>
{:else}
  <CollapsedTags {values} limit={4} />
{/if}
