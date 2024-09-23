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
  import activity, { ActivityMessage, Reaction } from '@hcengineering/activity'
  import { createQuery } from '@hcengineering/presentation'
  import { WithLookup } from '@hcengineering/core'

  import { getSpace, updateDocReactions } from '../../utils'
  import Reactions from './Reactions.svelte'

  export let object: WithLookup<ActivityMessage> | undefined
  export let readonly = false

  const reactionsQuery = createQuery()

  let reactions: Reaction[] = []

  $: hasReactions = (object?.reactions ?? 0) > 0
  $: lookupReactions = object?.$lookup?.reactions as Reaction[] | undefined

  $: updateReactions(hasReactions, object, lookupReactions)

  function updateReactions (hasReactions: boolean, object?: ActivityMessage, lookupReaction?: Reaction[]): void {
    if (lookupReaction !== undefined) {
      reactions = lookupReaction
    } else if (object && hasReactions) {
      reactionsQuery.query(
        activity.class.Reaction,
        { attachedTo: object._id, space: getSpace(object) },
        (res: Reaction[]) => {
          reactions = res
        }
      )
    } else {
      reactionsQuery.unsubscribe()
      reactions = []
    }
  }

  const handleClick = (ev: CustomEvent) => {
    if (readonly) return
    void updateDocReactions(reactions, object, ev.detail)
  }
</script>

{#if object && reactions.length > 0}
  <div class="footer flex-col p-inline contrast mt-2 min-h-6">
    <Reactions {reactions} {object} {readonly} on:click={handleClick} />
  </div>
{/if}
