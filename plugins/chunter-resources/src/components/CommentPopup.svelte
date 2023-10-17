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
  import { Label, resizeObserver, Spinner, closeTooltip, Lazy } from '@hcengineering/ui'
  import { DocNavLink, ObjectPresenter } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import CommentInput from './CommentInput.svelte'
  import CommentPresenter from './CommentPresenter.svelte'

  export let objectId: Ref<Doc>
  export let object: Doc
  export let withInput: boolean = true

  let loading = true

  let comments: Comment[] = []
  const query = createQuery()
  $: query.query(
    chunter.class.Comment,
    { attachedTo: objectId },
    (res) => {
      comments = res
      loading = false
    },
    { sort: { modifiedOn: SortingOrder.Ascending } }
  )
  const dispatch = createEventDispatcher()
  let commentMode = false

  $: if (commentMode) {
    dispatch('tooltip', { kind: 'popup' })
  }
</script>

<div class="container">
  <div
    class="flex-between header"
    use:resizeObserver={() => {
      dispatch('changeContent')
    }}
    on:keydown={(evt) => {
      console.log(evt)
      if (commentMode) {
        evt.preventDefault()
        evt.stopImmediatePropagation()
        closeTooltip()
      }
    }}
  >
    <div class="fs-title mr-2">
      <Label label={chunter.string.Comments} />
    </div>
    <DocNavLink {object}>
      <ObjectPresenter _class={object._class} objectId={object._id} value={object} />
    </DocNavLink>
  </div>
  <div class="comments">
    {#if loading}
      <div class="flex-center">
        <Spinner />
      </div>
    {:else}
      {#each comments as comment}
        <div class="item">
          <Lazy>
            <CommentPresenter value={comment} />
          </Lazy>
        </div>
      {/each}
    {/if}
  </div>
  {#if withInput}
    <div class="max-w-120 input">
      <CommentInput
        {object}
        on:focus={() => {
          commentMode = true
        }}
      />
    </div>
  {/if}
</div>

<style lang="scss">
  .item {
    max-width: 30rem;
  }
  .item + .item {
    margin-top: 0.75rem;
  }

  .input {
    padding: 1rem;
    padding-top: 0;
  }

  .comments {
    overflow: auto;
    flex: 1;
    padding: 1rem;
    padding-top: 0;
  }

  .container {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 30rem;
  }

  .header {
    border-bottom: 1px solid var(--theme-divider-color);
    padding: 1rem 1.5rem;
    margin-right: -0.5rem;
    margin-left: -0.5rem;
    margin-bottom: 1rem;
  }
</style>
