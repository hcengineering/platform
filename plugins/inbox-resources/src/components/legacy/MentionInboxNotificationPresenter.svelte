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
  import { ActivityMessagePreview } from '@hcengineering/activity-resources'
  import { MentionInboxNotification } from '@hcengineering/notification'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import { Doc } from '@hcengineering/core'
  import { Person } from '@hcengineering/contact'

  import CommonInboxNotificationPresenter from './CommonInboxNotificationPresenter.svelte'
  import PreviewTemplate from '../preview/PreviewTemplate.svelte'

  export let object: Doc
  export let value: MentionInboxNotification

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const query = createQuery()

  let message: ActivityMessage | undefined = undefined
  let person: Person | undefined = undefined

  $: if (hierarchy.isDerived(value.mentionedInClass, activity.class.ActivityMessage)) {
    query.query(value.mentionedInClass, { _id: value.mentionedIn }, (res) => {
      message = res[0] as ActivityMessage
    })
  } else {
    query.unsubscribe()
  }
</script>

{#if message}
  <PreviewTemplate
    kind="default"
    color="primary"
    bind:person
    socialId={message.createdBy ?? message.modifiedBy}
    date={new Date(message.createdOn ?? message.modifiedOn)}
    fixHeight={true}
  >
    <svelte:fragment slot="content">
      <ActivityMessagePreview value={message} doc={object} type="content-only" />
    </svelte:fragment>
  </PreviewTemplate>
{:else}
  <CommonInboxNotificationPresenter {value} on:click />
{/if}
