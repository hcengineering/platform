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
  import { createLabelsQuery, getClient } from '@hcengineering/presentation'
  import { Card } from '@hcengineering/card'
  import { Label } from '@hcengineering/communication-types'
  import tag, { type TagElement } from '@hcengineering/tags'
  import { TagElementPresenter } from '@hcengineering/tags-resources'
  import { Ref } from '@hcengineering/core'

  export let value: Card | undefined = undefined

  const client = getClient()

  let labels: Label[] = []
  let tags: TagElement[] = []

  const query = createLabelsQuery()
  $: value &&
    query.query({ card: value._id }, (res) => {
      labels = res
    })

  $: client
    .findAll(tag.class.TagElement, { _id: { $in: labels.map((it) => it.labelId) as any as Ref<TagElement>[] } })
    .then((res) => {
      tags = res
    })
</script>

{#if tags.length > 0}
  <div class="flex-row-center flex-wrap flex-gap-2">
    {#each tags as tagElement (tagElement._id)}
      <TagElementPresenter value={tagElement} />
    {/each}
  </div>
{/if}
