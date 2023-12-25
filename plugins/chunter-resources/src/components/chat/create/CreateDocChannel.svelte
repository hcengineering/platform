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
  import { getClient, SpaceCreateCard } from '@hcengineering/presentation'
  import notification, { DocNotifyContext } from '@hcengineering/notification'
  import { Doc, getCurrentAccount } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import { subscribe } from '@hcengineering/notification-resources'

  import chunter from '../../../plugin'
  import ActivityDocBoxList from './ActivityDocsBoxList.svelte'

  const dispatch = createEventDispatcher()
  const client = getClient()
  const account = getCurrentAccount()

  let selectedDoc: Doc | undefined = undefined

  async function handleCreate () {
    if (!selectedDoc) {
      return
    }

    const existingContext = await client.findOne<DocNotifyContext>(notification.class.DocNotifyContext, {
      user: account._id,
      attachedTo: selectedDoc._id
    })

    const navigate = await getResource(chunter.actionImpl.OpenChannel)

    if (existingContext !== undefined) {
      if (existingContext.hidden) {
        await client.update(existingContext, { hidden: false })
      }

      await navigate(existingContext)
      return
    }

    const notifyContextId = await client.createDoc(notification.class.DocNotifyContext, selectedDoc.space, {
      user: account._id,
      attachedTo: selectedDoc._id,
      attachedToClass: selectedDoc._class,
      hidden: false
    })

    await subscribe(selectedDoc._class, selectedDoc._id)

    await navigate(undefined, undefined, { _id: notifyContextId })
  }

  function handleUpdate (evt: CustomEvent) {
    selectedDoc = evt.detail
  }
</script>

<SpaceCreateCard
  label={chunter.string.NewDirectMessage}
  okAction={handleCreate}
  canSave={selectedDoc !== undefined}
  on:close={() => {
    dispatch('close')
  }}
>
  <ActivityDocBoxList label={chunter.string.Docs} {selectedDoc} on:update={handleUpdate} />
</SpaceCreateCard>
