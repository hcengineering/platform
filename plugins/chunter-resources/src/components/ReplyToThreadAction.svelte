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
  import { ActivityMessage } from '@hcengineering/activity'
  import { ActivityMessageAction } from '@hcengineering/activity-resources'

  import chunter from './../plugin'
  import { replyToThread } from '../index'
  import { canReplyToThread } from '../utils'

  export let object: ActivityMessage

  function onReply (): void {
    replyToThread(object)
  }
</script>

{#if canReplyToThread(object)}
  <ActivityMessageAction size="x-small" icon={chunter.icon.Thread} action={onReply} />
{/if}
