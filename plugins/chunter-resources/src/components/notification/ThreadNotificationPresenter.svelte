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
  import { ThreadMessage } from '@hcengineering/chunter'
  import ThreadMessagePresenter from '../threads/ThreadMessagePresenter.svelte'
  import { Action } from '@hcengineering/ui'
  import { ActivityInboxNotification } from '@hcengineering/notification'

  export let message: ThreadMessage
  export let notification: ActivityInboxNotification
  export let embedded = false
  export let showNotify = true
  export let withActions = true
  export let actions: Action[] = []
  export let excludedActions: string[] = []
  export let onClick: (() => void) | undefined = undefined
</script>

<ThreadMessagePresenter
  value={message}
  {embedded}
  showEmbedded={!embedded}
  {withActions}
  {actions}
  {excludedActions}
  hoverable={false}
  showNotify={showNotify && !notification.isViewed}
  {onClick}
/>
