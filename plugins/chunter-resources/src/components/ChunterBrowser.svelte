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

  let userSearch_: string = ''
  userSearch.subscribe((v) => (userSearch_ = v))

  let searchType: SearchType = SearchType.Messages

  const components = [
    { searchType: SearchType.Messages, component: MessagesBrowser, props: { withHeader: false } },
    {
      searchType: SearchType.Channels,
      component: SpaceBrowser,
      props: {
        _class: plugin.class.Channel,
        label: plugin.string.ChannelBrowser,
        createItemDialog: plugin.component.CreateChannel,
        createItemLabel: plugin.string.CreateChannel,
        withHeader: false
      }
    },
    {
      searchType: SearchType.Files,
      component: FileBrowser,
      props: {
        requestedSpaceClasses: [plugin.class.Channel, plugin.class.DirectMessage],
        withHeader: false,
        searchQuery: userSearch_
      }
    },
    { searchType: SearchType.Contacts, component: EmployeeBrowser }
  ]
</script>

<div class="ac-header divide full">
  <Header icon={workbench.icon.Search} intlLabel={plugin.string.ChunterBrowser} />
</div>

<div class="flex-center pt-3 pb-3 buttons">
  <div class="ml-1 p-1 btn">
    <Button
      label={plugin.string.Messages}
      selected={searchType === SearchType.Messages}
      kind="transparent"
      on:click={() => {
        searchType = SearchType.Messages
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
      }}
    />
  </div>
</div>
{#if components[searchType].component}
  <svelte:component
    this={components[searchType].component}
    withHeader={false}
    bind:search={userSearch_}
    {...components[searchType].props}
  />
{/if}

<style lang="scss">
  .btn {
    background-color: var(--theme-button-bg-enabled);
  }
</style>
