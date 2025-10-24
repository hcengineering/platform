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
  import { Ref, type Class, type Doc } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { FixedColumn, ObjectPresenter } from '@hcengineering/view-resources'
  import RatingEditor from './RatingEditor.svelte'
  import type { DocReaction } from '@hcengineering/rating'

  export let _class: Class<Doc>
  export let docs: { _id: Ref<Doc>, reactions: DocReaction[] }[] = []

  const query = createQuery()
  const limit: number = 20

  let objects: { doc: Doc, reactions: DocReaction[] }[] = []

  $: query.query(
    _class._id,
    { _id: { $in: docs.map((it) => it._id) } },
    (res) => {
      objects = res.map((doc) => ({
        doc,
        reactions: docs.find((it) => it._id === doc._id)?.reactions ?? []
      }))
    },
    { limit, total: true }
  )
</script>

<div class="ml-2 flex-col">
  {#each objects as doc (doc.doc._id)}
    <div class="flex-presenter p-1 flex flex-between">
      <FixedColumn key={'reactions_link'}>
        <ObjectPresenter _class={doc.doc._class} objectId={doc.doc._id} value={doc.doc} noUnderline />
      </FixedColumn>
      <RatingEditor _class={doc.doc._class} _id={doc.doc._id} reactions={doc.reactions} showMy={false} />
    </div>
  {/each}
</div>
