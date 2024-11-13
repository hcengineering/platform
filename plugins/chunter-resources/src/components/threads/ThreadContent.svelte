<script lang="ts">
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import { Label } from '@hcengineering/ui'
  import core, { Doc, Ref, Space } from '@hcengineering/core'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
  import notification from '@hcengineering/notification'
  import { createQuery, getClient } from '@hcengineering/presentation'

  import ThreadParentMessage from './ThreadParentPresenter.svelte'
  import ReverseChannelScrollView from '../ReverseChannelScrollView.svelte'
  import { ChannelDataProvider } from '../../channelDataProvider'
  import chunter from '../../plugin'

  export let selectedMessageId: Ref<ActivityMessage> | undefined = undefined
  export let message: ActivityMessage
  export let autofocus = true
  export let readonly: boolean = false
  export let onReply: ((message: ActivityMessage) => void) | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const query = createQuery()
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const contextByDocStore = inboxClient.contextByDoc

  let channel: Doc | undefined = undefined
  let dataProvider: ChannelDataProvider | undefined = undefined

  $: query.query(
    message.attachedToClass,
    { _id: message.attachedTo },
    (res) => {
      channel = res[0]
    },
    { limit: 1 }
  )

  $: void updateProvider(message)

  async function updateProvider (message: ActivityMessage): Promise<void> {
    if (dataProvider !== undefined) {
      return
    }

    const context =
      $contextByDocStore.get(message._id) ??
      (await client.findOne(notification.class.DocNotifyContext, { objectId: message._id }))
    dataProvider = new ChannelDataProvider(
      context,
      message.space,
      message._id,
      chunter.class.ThreadMessage,
      selectedMessageId,
      true
    )
  }

  $: messagesStore = dataProvider?.messagesStore
  $: readonly = hierarchy.isDerived(message.attachedToClass, core.class.Space)
    ? (readonly || (channel as Space)?.archived) ?? false
    : readonly
</script>

<div class="hulyComponent-content hulyComponent-content__container noShrink">
  {#if dataProvider !== undefined && channel !== undefined}
    <ReverseChannelScrollView
      bind:selectedMessageId
      object={message}
      {channel}
      provider={dataProvider}
      {autofocus}
      fullHeight={false}
      fixedInput={false}
      {onReply}
    >
      <svelte:fragment slot="header">
        <div class="mt-3">
          <ThreadParentMessage {message} {readonly} {onReply} />
        </div>

        {#if (message.replies ?? $messagesStore?.length ?? 0) > 0}
          <div class="separator">
            <div class="label lower">
              <Label
                label={activity.string.RepliesCount}
                params={{ replies: message.replies ?? $messagesStore?.length ?? 1 }}
              />
            </div>
            <div class="line" />
          </div>
        {/if}
      </svelte:fragment>
    </ReverseChannelScrollView>
  {/if}
</div>

<style lang="scss">
  .separator {
    display: flex;
    align-items: center;
    margin: 0.5rem 0;

    .label {
      white-space: nowrap;
      margin: 0 0.5rem;
      color: var(--theme-halfcontent-color);
    }

    .line {
      background: var(--theme-refinput-border);
      height: 1px;
      width: 100%;
    }
  }
</style>
