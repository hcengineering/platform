<script lang="ts">
  import attachment from '@anticrm/attachment'
  import { FileBrowser } from '@anticrm/attachment-resources'
  import { Button } from '@anticrm/ui'
  import workbench from '@anticrm/workbench'
  import { SpaceBrowser } from '@anticrm/workbench-resources'
  import Header from './Header.svelte'
  import contact from '@anticrm/contact-resources/src/plugin'
  import { EmployeeBrowser } from '@anticrm/contact-resources'
  import { userSearch } from '../index'
  import plugin from '../plugin'
  import { SearchType } from '../utils'
  import MessagesBrowser from './MessagesBrowser.svelte'
  import { FilterButton } from '@anticrm/view-resources'
  import { Filter } from '@anticrm/view'

  let userSearch_: string = ''
  userSearch.subscribe((v) => (userSearch_ = v))

  let searchType: SearchType = SearchType.Messages

  const components = [
    { searchType: SearchType.Messages, component: MessagesBrowser, filterClass: plugin.class.ChunterMessage },
    {
      searchType: SearchType.Channels,
      component: SpaceBrowser,
      filterClass: plugin.class.Channel,
      props: {
        _class: plugin.class.Channel,
        label: plugin.string.ChannelBrowser,
        withFilterButton: false
      }
    },
    {
      searchType: SearchType.Files,
      component: FileBrowser,
      props: {
        requestedSpaceClasses: [plugin.class.Channel, plugin.class.DirectMessage]
      }
    },
    { searchType: SearchType.Contacts, component: EmployeeBrowser, filterClass: contact.class.Employee }
  ]

  let filters: Filter[] = []
</script>

<div class="ac-header divide full">
  <Header icon={workbench.icon.Search} intlLabel={plugin.string.ChunterBrowser} />
</div>

<div class="p-3 bar">
  <div class="w-32 flex-center"><FilterButton _class={components[searchType].filterClass} bind:filters /></div>
  <div class="flex-center w-full mr-32 buttons">
    <div class="ml-1 p-1 btn">
      <Button
        label={plugin.string.Messages}
        selected={searchType === SearchType.Messages}
        kind="transparent"
        on:click={() => {
          searchType = SearchType.Messages
          filters = []
        }}
      />
    </div>
    <div class="ml-1 p-1 btn">
      <Button
        label={plugin.string.Channels}
        kind="transparent"
        selected={searchType === SearchType.Channels}
        on:click={() => {
          searchType = SearchType.Channels
          filters = []
        }}
      />
    </div>
    <div class="ml-1 p-1 btn">
      <Button
        label={attachment.string.Files}
        kind="transparent"
        selected={searchType === SearchType.Files}
        on:click={() => {
          searchType = SearchType.Files
          filters = []
        }}
      />
    </div>
    <div class="ml-1 p-1 btn">
      <Button
        kind="transparent"
        label={contact.string.Contacts}
        selected={searchType === SearchType.Contacts}
        on:click={() => {
          searchType = SearchType.Contacts
          filters = []
        }}
      />
    </div>
  </div>
</div>
{#if components[searchType].component}
  <svelte:component
    this={components[searchType].component}
    withHeader={false}
    bind:search={userSearch_}
    {filters}
    {...components[searchType].props}
  />
{/if}

<style lang="scss">
  .bar {
    display: flex;
    justify-content: start;
  }
</style>
