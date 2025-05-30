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
  import activity, { DisplayDocUpdateMessage } from '@hcengineering/activity'
  import { BaseMessagePreview } from '@hcengineering/activity-resources'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { getClient } from '@hcengineering/presentation'
  import { Icon, Label } from '@hcengineering/ui'
  import { ObjectPresenter } from '@hcengineering/view-resources'

  import request from '../plugin'

  export let message: DisplayDocUpdateMessage

  const me = getCurrentEmployee()
  const client = getClient()

  $: isRemovedMe = message.attributeUpdates?.removed.includes(me) ?? false
  $: isAddedMe = message.attributeUpdates?.added.includes(me) ?? false
</script>

<BaseMessagePreview {message} on:click>
  <slot name="content">
    <div class="content overflow-label ml-1" class:preview={true}>
      <span class="mr-1">
        <Icon icon={client.getHierarchy().getClass(message.objectClass).icon ?? activity.icon.Activity} size="small" />
      </span>
      {#if isAddedMe}
        <Label label={activity.string.New} />
      {:else if isRemovedMe}
        <Label label={request.string.Cancelled} />
      {:else}
        <Label label={activity.string.Updated} />
      {/if}
      <span class="lower">
        <Label label={request.string.Requests} />
      </span>
      :
      <span class="overflow-label values" class:preview={true}>
        <ObjectPresenter objectId={message.objectId} _class={message.objectClass} shouldShowAvatar={false} />
      </span>
    </div>
  </slot>
</BaseMessagePreview>

<style lang="scss">
  .content {
    display: flex;
    gap: 0.25rem;
    align-items: center;
    flex-wrap: wrap;
    color: var(--global-primary-TextColor);

    &.preview {
      flex-wrap: nowrap;
    }
  }

  .values {
    display: flex;
    align-items: center;
    flex-wrap: wrap;

    &.preview {
      flex-wrap: nowrap;
    }
  }
</style>
