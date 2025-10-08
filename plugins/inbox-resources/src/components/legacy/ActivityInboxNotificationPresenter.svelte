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
  import { getClient } from '@hcengineering/presentation'
  import { matchQuery, Doc } from '@hcengineering/core'
  import { ActivityNotificationViewlet, DisplayActivityInboxNotification } from '@hcengineering/notification'
  import {
    ActivityMessagePreview,
    combineActivityMessages,
    sortActivityMessages
  } from '@hcengineering/activity-resources'
  import activity, { ActivityMessage, DisplayActivityMessage, DocUpdateMessage } from '@hcengineering/activity'
  import { Component } from '@hcengineering/ui'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Person } from '@hcengineering/contact'

  import PreviewTemplate from '../preview/PreviewTemplate.svelte'

  export let object: Doc
  export let value: DisplayActivityInboxNotification
  export let viewlets: ActivityNotificationViewlet[] = []

  const client = getClient()

  let viewlet: ActivityNotificationViewlet | undefined = undefined
  let displayMessage: DisplayActivityMessage | undefined = undefined

  $: void updateDisplayMessage(value.combinedMessages)

  async function updateDisplayMessage (messages: ActivityMessage[]): Promise<void> {
    const combinedMessages = combineActivityMessages(sortActivityMessages(messages))

    displayMessage = combinedMessages[0]
  }

  $: updateViewlet(viewlets, displayMessage)

  function matchViewlet (viewlet: ActivityNotificationViewlet, message: DisplayActivityMessage): boolean {
    const hierarchy = client.getHierarchy()
    const matched = matchQuery([message], viewlet.messageMatch, message._class, hierarchy, true)[0]
    if (matched !== undefined) return true

    if (hierarchy.isDerived(message._class, activity.class.DocUpdateMessage)) {
      const dum = message as DocUpdateMessage
      const dumUpdated: DocUpdateMessage = {
        ...dum,
        objectClass: hierarchy.getParentClass(dum.objectClass)
      }
      const matched = matchQuery([dumUpdated], viewlet.messageMatch, message._class, hierarchy, true)[0]
      return matched !== undefined
    }

    return false
  }

  function updateViewlet (viewlets: ActivityNotificationViewlet[], message?: DisplayActivityMessage): void {
    if (viewlets.length === 0 || message === undefined) {
      viewlet = undefined
      return
    }

    for (const v of viewlets) {
      const matched = matchViewlet(v, message)
      if (matched) {
        viewlet = v
        return
      }
    }

    viewlet = undefined
  }

  let person: Person | undefined = undefined
</script>

{#if displayMessage !== undefined}
  <PreviewTemplate
    kind="default"
    color="primary"
    bind:person
    socialId={displayMessage.createdBy ?? displayMessage.modifiedBy}
    date={new Date(displayMessage.createdOn ?? displayMessage.modifiedOn)}
    fixHeight={true}
    tooltipLabel={getEmbeddedLabel('')}
  >
    <svelte:fragment slot="content">
      {#if viewlet}
        <Component
          is={viewlet.presenter}
          showLoading={false}
          props={{
            message: displayMessage,
            notification: value,
            type: 'content-only'
          }}
          on:click
        />
      {:else}
        <ActivityMessagePreview value={displayMessage} doc={object} type="content-only" />
      {/if}
    </svelte:fragment>
  </PreviewTemplate>
{/if}
