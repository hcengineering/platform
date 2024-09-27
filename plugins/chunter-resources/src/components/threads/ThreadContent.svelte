<script lang="ts">
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import ThreadParentMessage from './ThreadParentPresenter.svelte'
  import { Label } from '@hcengineering/ui'
  import ChannelScrollView from '../ChannelScrollView.svelte'
  import core, { Doc, Ref, Space } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'

  import { ChannelDataProvider } from '../../channelDataProvider'
  import chunter from '../../plugin'

  export let selectedMessageId: Ref<ActivityMessage> | undefined = undefined
  export let message: ActivityMessage

  const query = createQuery()
  const client = getClient()
  const hierarchy = client.getHierarchy()

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

  $: if (message !== undefined && dataProvider === undefined) {
    dataProvider = new ChannelDataProvider(
      undefined,
      message.space,
      message._id,
      chunter.class.ThreadMessage,
      selectedMessageId,
      true
    )
  }

  $: messagesStore = dataProvider?.messagesStore
  $: readonly = hierarchy.isDerived(message.attachedToClass, core.class.Space)
    ? (channel as Space)?.archived ?? false
    : false
</script>

<div class="hulyComponent-content hulyComponent-content__container noShrink">
  {#if dataProvider !== undefined && channel !== undefined}
    <ChannelScrollView
      bind:selectedMessageId
      embedded
      skipLabels
      object={message}
      {channel}
      provider={dataProvider}
      fullHeight={false}
      fixedInput={false}
    >
      <svelte:fragment slot="header">
        <div class="mt-3">
          <ThreadParentMessage {message} {readonly} />
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
    </ChannelScrollView>
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
