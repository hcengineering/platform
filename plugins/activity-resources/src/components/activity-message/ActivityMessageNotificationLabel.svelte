<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { Label } from '@hcengineering/ui'
  import { DocNotifyContext } from '@hcengineering/notification'
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Doc, Ref } from '@hcengineering/core'
  import { getDocLinkTitle, ObjectIcon } from '@hcengineering/view-resources'
  import contact from '@hcengineering/contact'

  import ActivityMessagePreview from './ActivityMessagePreview.svelte'

  export let context: DocNotifyContext

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const parentQuery = createQuery()

  let parentMessage: ActivityMessage | undefined = undefined
  let title: string | undefined = undefined
  let object: Doc | undefined = undefined

  $: parentQuery.query(activity.class.ActivityMessage, { _id: context.attachedTo as Ref<ActivityMessage> }, (res) => {
    parentMessage = res[0]
  })

  $: parentMessage &&
    client.findOne(parentMessage.attachedToClass, { _id: parentMessage.attachedTo }).then((res) => {
      object = res
    })

  $: object &&
    getDocLinkTitle(client, object._id, object._class, object).then((res) => {
      title = res
    })
</script>

{#if parentMessage}
  <span class="flex-presenter flex-gap-1 font-semi-bold">
    <Label label={(parentMessage?.replies ?? 0) > 0 ? activity.string.Thread : activity.string.Message} />
    {#if title}
      <span class="lower">
        <Label label={activity.string.In} />
      </span>
      {#if object}
        <span class="flex-presenter flex-gap-0-5">
          <ObjectIcon
            value={object}
            size={hierarchy.isDerived(object._class, contact.class.Person) ? 'tiny' : 'small'}
          />
          {title}
        </span>
      {/if}
    {/if}
  </span>
  <span class="font-normal">
    <ActivityMessagePreview value={parentMessage} readonly type="content-only" />
  </span>
{/if}
