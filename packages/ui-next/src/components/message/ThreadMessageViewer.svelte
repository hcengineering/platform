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
  import { Message, Thread } from '@hcengineering/communication-types'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import cardPlugin, { Card } from '@hcengineering/card'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import { Label } from '@hcengineering/ui'
  import {Class, type Ref} from '@hcengineering/core'

  export let message: Message
  export let thread: Thread | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const threadCardQuery = createQuery()

  let threadCard: Card | undefined
  let isLoaded = false

  $: if (thread !== undefined) {
    threadCardQuery.query(
      cardPlugin.class.Card,
      { _id: thread.thread as Ref<Card> },
      (res) => {
        threadCard = res[0]
        isLoaded = true
      },
      { limit: 1 }
    )
  } else {
    threadCard = undefined
    threadCardQuery.unsubscribe()
    isLoaded = true
  }

  $: if (thread?.thread !== threadCard?._id) {
    threadCard = undefined
  }

  $:threadClass = threadCard?._class ?? thread?.threadType ?? '' as Ref<Class<Card>>
  $: label = hierarchy.hasClass(threadClass) ? hierarchy.getClass(threadClass).label : undefined
  $:isDeleted = isLoaded && threadCard == null
</script>

<div class="thread-view">
  {#if label && !isDeleted}
  <div class="thread-type">
    <Label {label} />
  </div>
    {/if}
  {#if threadCard}
    <ObjectPresenter
      objectId={threadCard._id}
      _class={threadCard._class}
      value={threadCard}
      colorInherit
      shouldShowAvatar={false}
    />
    {:else if isDeleted}
    <div class="deletedText">
      This thread was deleted.
    </div>
  {/if}
</div>

<style lang="scss">
  .thread-view {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .thread-type {
    padding: 0.25rem 0.5rem;
    height: 1.5rem;
    border: 1px solid var(--theme-content-color);
    max-width: 10rem;
    overflow: hidden;
    border-radius: 6rem;

    color: var(--theme-caption-color);

    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .deletedText {
    color: var(--theme-text-placeholder-color);
  }
</style>
