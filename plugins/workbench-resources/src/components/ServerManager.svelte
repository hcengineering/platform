<script lang="ts">
  import ServerManagerCollaboratorStatistics from './ServerManagerCollaboratorStatistics.svelte'

  import ServerManagerFrontStatistics from './ServerManagerFrontStatistics.svelte'

  import ServerManagerServerStatistics from './ServerManagerServerStatistics.svelte'

  import ServerManagerUsers from './ServerManagerUsers.svelte'

  import ServerManagerGeneral from './ServerManagerGeneral.svelte'

  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'
  import presentation from '@hcengineering/presentation'
  import { Header, TabItem, Switcher, Breadcrumb, IconSettings, ButtonIcon, IconClose } from '@hcengineering/ui'
  import ServerManagerAccountStatistics from './ServerManagerAccountStatistics.svelte'

  const dispatch = createEventDispatcher()

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
  let selectedTab: string | number = tabs[0].id
</script>

<div class="hulyComponent">
  <Header type={'type-panel'} freezeBefore>
    <svelte:fragment slot="beforeTitle">
      <ButtonIcon
        icon={IconClose}
        kind={'secondary'}
        size={'small'}
        tooltip={{ label: presentation.string.Close }}
        on:click={() => dispatch('close')}
      />
    </svelte:fragment>

    <Breadcrumb icon={IconSettings} title={'Server manager'} size={'large'} isCurrent />

    <svelte:fragment slot="actions">
      <Switcher
        name={'swManagerMode'}
        items={tabs}
        bind:selected={selectedTab}
        kind={'subtle'}
        on:select={(result) => {
          selectedTab = result.detail.id
        }}
      />
    </svelte:fragment>
  </Header>

  <div class="hulyComponent-content__column content">
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
  </div>
</div>
