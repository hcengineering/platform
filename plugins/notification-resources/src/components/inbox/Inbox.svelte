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
  import { DisplayInboxNotification } from '@hcengineering/notification'
  import { ActionContext } from '@hcengineering/presentation'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { Label, Scroller } from '@hcengineering/ui'
  import { IntlString } from '@hcengineering/platform'

  import { InboxNotificationsClientImpl } from '../../inboxNotificationsClient'
  import Filter from '../Filter.svelte'
  import { getDisplayInboxNotifications } from '../../utils'
  import { InboxNotificationsFilter } from '../../types'
  import InboxNotificationPresenter from './InboxNotificationPresenter.svelte'

  export let label: IntlString
  export let _class: Ref<Class<Doc>> | undefined = undefined

  const inboxClient = InboxNotificationsClientImpl.getClient()
  const inboxNotificationsByContextStore = inboxClient.inboxNotificationsByContext

  let displayNotifications: DisplayInboxNotification[] = []
  let filter: InboxNotificationsFilter = 'all'

  $: getDisplayInboxNotifications($inboxNotificationsByContextStore, filter, _class).then((res) => {
    displayNotifications = res
  })
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

<div class="ac-header full divide caption-height">
  <div class="ac-header__wrap-title mr-3">
    <span class="ac-header__title"><Label {label} /></span>
  </div>
  <div class="flex flex-gap-2">
    <Filter bind:filter />
  </div>
</div>

<Scroller>
  <div class="content">
    {#each displayNotifications as notification}
      <InboxNotificationPresenter value={notification} />
    {/each}
  </div>
</Scroller>

<style lang="scss">
  .content {
    padding: 0 24px;
  }
</style>
