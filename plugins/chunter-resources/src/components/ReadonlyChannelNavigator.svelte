<script lang="ts">
  import { AnySvelteComponent, NavGroup, Scroller } from '@hcengineering/ui'
  import ChatNavItem from './chat/navigator/ChatNavItem.svelte'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import core, { Doc, getCurrentAccount } from '@hcengineering/core'
  import chunter from '../plugin'
  import { ChatNavItemModel } from './chat/types'
  import view from '@hcengineering/view'
  import { getResource, translate } from '@hcengineering/platform'
  import { getChannelName, getObjectIcon } from '../utils'

  export let object: Doc | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const query = createQuery()

  let items: ChatNavItemModel[] = []
  $: query.query(
    chunter.class.Channel,
    {
      ...{ space: core.space.Space, archived: false, members: getCurrentAccount().uuid }
    },
    async (res) => {
      const newItems: ChatNavItemModel[] = []
      for (const object of res) {
        const { _class } = object
        const titleIntl = hierarchy.getClass(_class).label

        newItems.push({
          id: object._id,
          object,
          title: (await getChannelName(object._id, object._class, object)) ?? (await translate(titleIntl, {})),
          icon: getObjectIcon(_class),
          iconProps: { showStatus: true },
          iconSize: 'small',
          withIconBackground: true
        })
      }
      items = newItems
    }
  )
</script>

<Scroller shrink>
  {#if items.length > 0}
    <NavGroup
      _id="channels"
      label={chunter.string.Channel}
      categoryName="channels"
      highlighted={items.some((it) => it.id === object?._id)}
      isFold={false}
      empty={items.length === 0}
      visible={true}
    >
      {#each items as item (item.id)}
        <ChatNavItem context={undefined} isSelected={item.id === object?._id} {item} type={'type-object'} on:select />
      {/each}
    </NavGroup>
  {/if}
</Scroller>

<style lang="scss">
  .showMore {
    margin: var(--spacing-1);
    font-size: 0.75rem;
  }
</style>
