<script lang="ts">
  import ServerManagerCollaboratorStatistics from './ServerManagerCollaboratorStatistics.svelte'

  import ServerManagerFrontStatistics from './ServerManagerFrontStatistics.svelte'

  import ServerManagerServerStatistics from './ServerManagerServerStatistics.svelte'

  import ServerManagerUsers from './ServerManagerUsers.svelte'

  import ServerManagerGeneral from './ServerManagerGeneral.svelte'

  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Panel, TabItem, TabList } from '@hcengineering/ui'
  import ServerManagerAccountStatistics from './ServerManagerAccountStatistics.svelte'

  const tabs: TabItem[] = [
    {
      id: 'general',
      labelIntl: getEmbeddedLabel('General')
    },
    {
      id: 'account',
      labelIntl: getEmbeddedLabel('Account')
    },
    {
      id: 'statistics',
      labelIntl: getEmbeddedLabel('Server')
    },
    {
      id: 'statistics-front',
      labelIntl: getEmbeddedLabel('Front')
    },
    {
      id: 'statistics-collab',
      labelIntl: getEmbeddedLabel('Collaborator')
    },
    {
      id: 'users',
      labelIntl: getEmbeddedLabel('Users')
    }
  ]
  let selectedTab: string = tabs[0].id
</script>

<Panel on:close isFullSize useMaxWidth={true}>
  <svelte:fragment slot="title">
    <span class="p-3"> Server manager </span>
    <TabList
      items={tabs}
      bind:selected={selectedTab}
      kind={'separated'}
      on:select={(result) => {
        selectedTab = result.detail.id
      }}
    />
  </svelte:fragment>
  {#if selectedTab === 'general'}
    <ServerManagerGeneral />
  {:else if selectedTab === 'users'}
    <ServerManagerUsers />
  {:else if selectedTab === 'statistics'}
    <ServerManagerServerStatistics />
  {:else if selectedTab === 'statistics-front'}
    <ServerManagerFrontStatistics />
  {:else if selectedTab === 'statistics-collab'}
    <ServerManagerCollaboratorStatistics />
  {:else if selectedTab === 'account'}
    <ServerManagerAccountStatistics />
  {/if}
</Panel>

<style lang="scss">
  .greyed {
    color: rgba(black, 0.5);
  }
</style>
