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
  import { ActivityInboxNotification, DocNotifyContext } from '@hcengineering/notification'
  import activity, { ActivityMessage, DocUpdateMessage, Reaction } from '@hcengineering/activity'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import core, { Doc, Ref } from '@hcengineering/core'
  import { getDocLinkTitle } from '@hcengineering/view-resources'
  import view from '@hcengineering/view'
  import { EmployeePresenter, personAccountByIdStore } from '@hcengineering/contact-resources'
  import { PersonAccount } from '@hcengineering/contact'

  import ActivityDocLink from '../ActivityDocLink.svelte'
  import ReactionPresenter from '../reactions/ReactionPresenter.svelte'

  export let context: DocNotifyContext
  export let notification: ActivityInboxNotification

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const parentQuery = createQuery()
  const messageQuery = createQuery()

  let parentMessage: ActivityMessage | undefined = undefined
  let message: ActivityMessage | undefined = undefined
  let title: string | undefined = undefined
  let object: Doc | undefined = undefined

  $: messageQuery.query(notification.attachedToClass, { _id: notification.attachedTo }, (res) => {
    message = res[0]
  })

  $: parentQuery.query(activity.class.ActivityMessage, { _id: context.attachedTo as Ref<ActivityMessage> }, (res) => {
    parentMessage = res[0]
  })

  $: parentMessage &&
    getDocLinkTitle(client, parentMessage.attachedTo, parentMessage.attachedToClass).then((res) => {
      title = res
    })

  $: parentMessage &&
    client.findOne(parentMessage.attachedToClass, { _id: parentMessage.attachedTo }).then((res) => {
      object = res
    })

  $: panelMixin = parentMessage
    ? hierarchy.classHierarchyMixin(parentMessage.attachedToClass, view.mixin.ObjectPanel)
    : undefined
  $: panelComponent = panelMixin?.component ?? view.component.EditDoc

  $: isReaction =
    message &&
    hierarchy.isDerived(message._class, activity.class.DocUpdateMessage) &&
    (message as DocUpdateMessage).objectClass === activity.class.Reaction
  $: reaction = (isReaction ? (message as DocUpdateMessage).objectId : undefined) as Ref<Reaction> | undefined

  $: personAccount =
    message && $personAccountByIdStore.get((message?.createdBy ?? message.modifiedBy) as Ref<PersonAccount>)
</script>

{#if object}
  {#if reaction}
    <div class="labels">
      <div class="label overflow-label">
        <Label label={activity.string.Message} />
        <ActivityDocLink {title} preposition={activity.string.In} {object} {panelComponent} />
      </div>

      <div class="flex-baseline gap-2">
        {#if personAccount?.person}
          <EmployeePresenter value={personAccount.person} shouldShowAvatar={false} />
        {:else}
          <div class="strong">
            <Label label={core.string.System} />
          </div>
        {/if}

        <div class="lower">
          <Label label={activity.string.Reacted} />
        </div>

        <ReactionPresenter _id={reaction} />
      </div>
    </div>
  {:else}
    <div class="label overflow-label">
      <Label label={activity.string.Message} />
      <ActivityDocLink {title} preposition={activity.string.In} {object} {panelComponent} />
    </div>
  {/if}
{/if}

<style lang="scss">
  .label {
    width: 20rem;
    max-width: 20rem;
  }

  .labels {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
</style>
