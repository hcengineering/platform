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
  import { ActivityMessagePreview, BasePreview } from '@hcengineering/activity-resources'
  import { ReactionInboxNotification } from '@hcengineering/notification'
  import { createQuery } from '@hcengineering/presentation'
  import { ActivityMessage } from '@hcengineering/activity'
  import { Doc } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { EmojiPresenter } from '@hcengineering/emoji-resources'

  export let object: Doc | undefined
  export let value: ReactionInboxNotification

  const query = createQuery()

  let message: ActivityMessage | undefined = undefined

  query.query(value.attachedToClass, { _id: value.attachedTo }, (res) => {
    message = res[0]
  })
  $: socialId = value.createdBy ?? value.modifiedBy
  $: date = new Date(value.createdOn ?? value.modifiedOn)
</script>

<div class="reaction-notification" on:click>
  <BasePreview
    intlLabel={getEmbeddedLabel('Reacted to your message')}
    color="secondary"
    lower
    account={socialId}
    timestamp={date.getTime()}
  />

  <div class="reaction-notification__body">
    <div class="reaction-notification__emoji">
      <EmojiPresenter emoji={value.emoji} fitSize center />
    </div>
    {#if message}
      <ActivityMessagePreview value={message} doc={object} type="content-only" />
    {/if}
  </div>
</div>

<style lang="scss">
  .reaction-notification {
    display: flex;
    flex-direction: column;
    color: var(--global-secondary-TextColor);
    white-space: nowrap;

    &__body {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding-right: var(--spacing-0_75);
      padding-left: var(--spacing-1_25);
    }

    &__emoji {
      display: flex;
      align-items: center;
      font-size: 1.25rem;
      width: 1.325rem;
      min-width: 1.325rem;
      min-height: 1.325rem;
      height: 1.325rem;
      overflow: hidden;
      margin-right: 0.25rem;
    }
  }
</style>
