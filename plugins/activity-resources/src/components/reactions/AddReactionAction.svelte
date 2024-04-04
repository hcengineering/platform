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
  import { EmojiPopup, IconEmoji, showPopup } from '@hcengineering/ui'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import activity, { ActivityMessage, Reaction } from '@hcengineering/activity'

  import { updateDocReactions } from '../../utils'
  import ActivityMessageAction from '../ActivityMessageAction.svelte'

  export let object: ActivityMessage | undefined = undefined

  const client = getClient()

  const reactionsQuery = createQuery()
  const dispatch = createEventDispatcher()

  let reactions: Reaction[] = []
  let isOpened = false

  $: if (object?.reactions && object.reactions > 0) {
    reactionsQuery.query(activity.class.Reaction, { attachedTo: object._id }, (res?: Reaction[]) => {
      reactions = res || []
    })
  }

  function openEmojiPalette (ev: Event) {
    dispatch('open')
    showPopup(
      EmojiPopup,
      {},
      ev.target as HTMLElement,
      (emoji: string) => {
        updateDocReactions(client, reactions, object, emoji)
        isOpened = false
        dispatch('close')
      },
      undefined,
      { category: 'popup', overlay: true, zIndexOverride: 10002 }
    )

    isOpened = true
  }
</script>

<ActivityMessageAction icon={IconEmoji} action={openEmojiPalette} opened={isOpened} />
