<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { Doc, Ref, SortingOrder } from '@hcengineering/core'

  import chunter, { Comment } from '@hcengineering/chunter'
  import { createQuery } from '@hcengineering/presentation'
  import CommentPresenter from './CommentPresenter.svelte'
  import { DocNavLink, ObjectPresenter } from '@hcengineering/view-resources'
  import { Button, IconOpen, Label } from '@hcengineering/ui'

  export let objectId: Ref<Doc>
  export let object: Doc

  let comments: Comment[] = []
  const query = createQuery()
  $: query.query(
    chunter.class.Comment,
    { attachedTo: objectId },
    (res) => {
      comments = res
    },
    { sort: { modifiedOn: SortingOrder.Descending } }
  )
</script>

<div class="flex flex-between flex-grow p-1 mb-4">
  <div class="fs-title">
    <Label label={chunter.string.Comments} />
  </div>
  <DocNavLink {object}>
    <ObjectPresenter _class={object._class} objectId={object._id} value={object} />
  </DocNavLink>
</div>
<div class="comments max-h-120 flex-row">
  {#each comments as comment}
    <div class="item">
      <CommentPresenter value={comment} />
    </div>
  {/each}
</div>

<style lang="scss">
  .item {
    max-width: 30rem;
  }
  .item + .item {
    margin-top: 0.75rem;
  }
  .comments {
    overflow: auto;
  }
</style>
