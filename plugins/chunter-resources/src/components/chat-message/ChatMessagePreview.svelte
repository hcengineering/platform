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
  import { ActivityMessagePreviewType } from '@hcengineering/activity'
  import { BaseMessagePreview } from '@hcengineering/activity-resources'
  import attachment, { Attachment } from '@hcengineering/attachment'
  import { AttachmentsTooltip } from '@hcengineering/attachment-resources'
  import { ChatMessage } from '@hcengineering/chunter'
  import { createQuery } from '@hcengineering/presentation'
  import { Action, Icon, Label, tooltip } from '@hcengineering/ui'
  import { isEmptyMarkup } from '@hcengineering/text'

  export let value: ChatMessage
  export let readonly = false
  export let type: ActivityMessagePreviewType = 'full'
  export let actions: Action[] = []

  const attachmentsQuery = createQuery()

  let attachments: Attachment[] = []

  $: if (value.attachments !== undefined && value.attachments > 0) {
    attachmentsQuery.query(
      attachment.class.Attachment,
      {
        attachedTo: value._id
      },
      (res) => {
        attachments = res
      }
    )
  } else {
    attachmentsQuery.unsubscribe()
  }
</script>

<BaseMessagePreview text={value.message} message={value} {type} {readonly} {actions} on:click>
  {#if value.attachments && type === 'full' && !isEmptyMarkup(value.message)}
    <div class="attachments" use:tooltip={{ component: AttachmentsTooltip, props: { attachments } }}>
      {value.attachments}
      <Icon icon={attachment.icon.Attachment} size="small" />
    </div>
  {:else if attachments.length > 0 && isEmptyMarkup(value.message)}
    <span class="font-normal">
      <Label label={attachment.string.Attachments} />:
      <span class="ml-1">
        {attachments.map(({ name }) => name).join(', ')}
      </span>
    </span>
  {/if}
</BaseMessagePreview>

<style lang="scss">
  .attachments {
    margin-left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--global-secondary-TextColor);

    &:hover {
      cursor: pointer;
      color: var(--global-primary-TextColor);
    }
  }
</style>
