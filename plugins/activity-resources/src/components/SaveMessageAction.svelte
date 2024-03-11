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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import activity, { ActivityMessage, SavedMessage } from '@hcengineering/activity'
  import preference from '@hcengineering/preference'

  import BookmarkBorder from './icons/BookmarkBorder.svelte'
  import ActivityMessageAction from './ActivityMessageAction.svelte'
  import Bookmark from './icons/Bookmark.svelte'
  import { savedMessagesStore } from '../activity'

  export let object: ActivityMessage

  const client = getClient()

  let savedMessage: SavedMessage | undefined = undefined

  savedMessagesStore.subscribe((saved) => {
    savedMessage = saved.find(({ attachedTo }) => attachedTo === object._id)
  })

  async function toggleSaveMessage (): Promise<void> {
    if (savedMessage !== undefined) {
      await client.remove(savedMessage)
      savedMessage = undefined
    } else {
      await client.createDoc(activity.class.SavedMessage, preference.space.Preference, {
        attachedTo: object._id
      })
    }
  }
</script>

<ActivityMessageAction
  icon={savedMessage ? Bookmark : BookmarkBorder}
  size={savedMessage ? 'small' : 'x-small'}
  iconProps={{ fill: savedMessage ? 'var(--global-accent-TextColor)' : 'currentColor' }}
  action={toggleSaveMessage}
/>
