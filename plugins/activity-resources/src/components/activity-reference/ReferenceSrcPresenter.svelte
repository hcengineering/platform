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
  import type { Doc } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { DocReferencePresenter } from '@hcengineering/view-resources'
  import activity from '../../plugin'

  import { isActivityMessage } from '../../activityMessagesUtils'
  import view from '@hcengineering/view'
  import { Icon, Label } from '@hcengineering/ui'

  export let value: Doc | undefined

  const client = getClient()

  let parentObject: Doc | undefined

  $: showParent = isActivityMessage(value)

  $: isActivityMessage(value) &&
    client.findOne(value.attachedToClass, { _id: value.attachedTo }).then((res) => {
      parentObject = res
    })
</script>

<DocReferencePresenter value={showParent ? parentObject : value} compact={showParent}>
  <svelte:fragment slot="prefix">
    {#if showParent}
      <span class="nowrap flex-presenter flex-gap-1 lower ml-2">
        <Icon icon={view.icon.Bubble} size="x-small" />
        <Label label={activity.string.Thread} />
        <Label label={activity.string.In} />
      </span>
    {/if}
  </svelte:fragment>
</DocReferencePresenter>
