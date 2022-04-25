<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Doc } from '@anticrm/core'
  import { Button, Tooltip } from '@anticrm/ui'
  import notification from '../plugin'
  import { NotificationClientImpl } from '../utils'

  export let value: Doc

  const notificationClient = NotificationClientImpl.getClient()
  const lastViews = notificationClient.getLastViews()
  $: lastView = $lastViews.get(value._id)
  $: subscribed = lastView !== undefined && lastView !== -1
</script>

<Tooltip label={subscribed ? notification.string.DontTrack : notification.string.Track}>
  <Button
    size={'medium'}
    kind={'transparent'}
    icon={subscribed ? notification.icon.DontTrack : notification.icon.Track}
    on:click={() => {
      if (subscribed) notificationClient.unsubscribe(value._id)
      else notificationClient.updateLastView(value._id, value._class, undefined, true)
    }}
  />
</Tooltip>
