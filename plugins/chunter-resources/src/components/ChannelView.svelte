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
  import { Ref, Doc } from '@hcengineering/core'
  import { getLocation, navigate } from '@hcengineering/ui'
  import { DocNotifyContext } from '@hcengineering/notification'
  import activity, { ActivityMessagesFilter } from '@hcengineering/activity'
  import { ChatMessage } from '@hcengineering/chunter'

  import Channel from './Channel.svelte'
  import PinnedMessages from './PinnedMessages.svelte'
  import ChannelHeader from './ChannelHeader.svelte'

  export let notifyContext: DocNotifyContext
  export let object: Doc
  export let filterId: Ref<ActivityMessagesFilter> = activity.ids.AllFilter

  function openThread (_id: Ref<ChatMessage>) {
    const loc = getLocation()
    loc.path[4] = _id
    navigate(loc)
  }
</script>

<ChannelHeader {object} />
<PinnedMessages {notifyContext} />
<Channel
  {notifyContext}
  {object}
  {filterId}
  on:openThread={(e) => {
    openThread(e.detail)
  }}
/>
