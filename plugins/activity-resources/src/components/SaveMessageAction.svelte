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
  import { ActionIcon } from '@hcengineering/ui'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import activity, { ActivityMessage, SavedMessage } from '@hcengineering/activity'
  import preference from '@hcengineering/preference'

  import Bookmark from './icons/Bookmark.svelte'

  export let object: ActivityMessage

  const client = getClient()
  const query = createQuery()

  let savedMessage: SavedMessage | undefined = undefined

  $: query.query(activity.class.SavedMessage, { attachedTo: object._id }, (res) => {
    savedMessage = res[0]
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

<ActionIcon
  icon={Bookmark}
  iconProps={savedMessage ? { fill: '#3265cb' } : undefined}
  size="medium"
  action={toggleSaveMessage}
/>
