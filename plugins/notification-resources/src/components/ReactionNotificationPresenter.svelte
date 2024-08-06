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
  import activity, { DisplayDocUpdateMessage, Reaction } from '@hcengineering/activity'
  import { getClient } from '@hcengineering/presentation'
  import { Ref } from '@hcengineering/core'
  import { BaseMessagePreview } from '@hcengineering/activity-resources'

  export let message: DisplayDocUpdateMessage

  const client = getClient()

  let reactions: Reaction[] = []

  $: void client
    .findAll(activity.class.Reaction, {
      space: message.space,
      _id: { $in: [message.objectId, ...(message?.previousMessages?.map((a) => a.objectId) ?? [])] as Ref<Reaction>[] }
    })
    .then((res) => {
      reactions = res
    })
</script>

<BaseMessagePreview text={reactions.map((r) => r.emoji).join('')} {message} on:click />
