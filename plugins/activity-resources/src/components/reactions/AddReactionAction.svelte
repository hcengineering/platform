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
  import { createEventDispatcher } from 'svelte'
  import { ActionIcon, EmojiPopup, IconEmoji, showPopup } from '@hcengineering/ui'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import activity, { ActivityMessage, Reaction } from '@hcengineering/activity'

  import { updateDocReactions } from '../../utils'

  export let object: ActivityMessage | undefined = undefined

  const client = getClient()

  const reactionsQuery = createQuery()
  const dispatch = createEventDispatcher()

  let reactions: Reaction[] = []

  $: if (object) {
    reactionsQuery.query(activity.class.Reaction, { attachedTo: object._id }, (res?: Reaction[]) => {
      reactions = res || []
    })
  }

  function openEmojiPalette (ev: Event) {
    dispatch('open')
    showPopup(EmojiPopup, {}, ev.target as HTMLElement, (emoji: string) => {
      updateDocReactions(client, reactions, object, emoji)
      dispatch('close')
    })
  }
</script>

<ActionIcon icon={IconEmoji} size="medium" action={openEmojiPalette} />
