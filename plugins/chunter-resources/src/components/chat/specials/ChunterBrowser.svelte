<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import attachment from '@hcengineering/attachment'
  import { FileBrowser } from '@hcengineering/attachment-resources'
  import { AnySvelteComponent, Button, Scroller } from '@hcengineering/ui'
  import workbench from '@hcengineering/workbench'
  import { SpaceBrowser } from '@hcengineering/workbench-resources'
  import contact from '@hcengineering/contact-resources/src/plugin'
  import { EmployeeBrowser } from '@hcengineering/contact-resources'
  import MessagesBrowser from './MessagesBrowser.svelte'
  import { FilterButton } from '@hcengineering/view-resources'
  import { Class, Doc, Ref } from '@hcengineering/core'

  import { userSearch } from '../../../index'
  import { SearchType } from '../../../utils'
  import plugin from '../../../plugin'
  import Header from '../../Header.svelte'
  import ChannelBrowser from './ChannelBrowser.svelte'

  let userSearch_: string = ''
  userSearch.subscribe((v) => (userSearch_ = v))

  let searchType: SearchType = SearchType.Messages

  const components: {
    component: AnySvelteComponent
    searchType: SearchType
    filterClass?: Ref<Class<Doc>>
    props?: Record<string, any>
  }[] = [
    { searchType: SearchType.Messages, component: MessagesBrowser },
    {
      searchType: SearchType.Channels,
      component: ChannelBrowser,
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
    { searchType: SearchType.Contacts, component: EmployeeBrowser, filterClass: contact.mixin.Employee }
  ]
</script>

<div class="flex-col h-full">
  <div class="ac-header divide full caption-height" style="padding: 0.5rem 1rem">
    <Header icon={workbench.icon.Search} intlLabel={plugin.string.ChunterBrowser} titleKind="breadcrumbs" />
  </div>
  <div class="h-full browser">
    <div class="pb-16 component">
      <div class="h-full">
        {#if components[searchType].component}
          <Scroller>
            <svelte:component
              this={components[searchType].component}
              withHeader={false}
              bind:search={userSearch_}
              {...components[searchType].props}
            />
          </Scroller>
        {/if}
      </div>
    </div>
    <div class="p-3 bar">
      <div class="w-32 flex-center"><FilterButton _class={components[searchType].filterClass} /></div>
      <div class="flex-center w-full mr-32 buttons">
        <div class="ml-1 p-1 btn">
          <Button
            label={plugin.string.Messages}
            selected={searchType === SearchType.Messages}
            kind="ghost"
            on:click={() => {
              searchType = SearchType.Messages
            }}
          />
        </div>
        <div class="ml-1 p-1 btn">
          <Button
            label={plugin.string.Channels}
            kind="ghost"
            selected={searchType === SearchType.Channels}
            on:click={() => {
              searchType = SearchType.Channels
            }}
          />
        </div>
        <div class="ml-1 p-1 btn">
          <Button
            label={attachment.string.Files}
            kind="ghost"
            selected={searchType === SearchType.Files}
            on:click={() => {
              searchType = SearchType.Files
            }}
          />
        </div>
        <div class="ml-1 p-1 btn">
          <Button
            kind="ghost"
            label={contact.string.Contacts}
            selected={searchType === SearchType.Contacts}
            on:click={() => {
              searchType = SearchType.Contacts
            }}
          />
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="scss">
  .browser {
    flex-grow: 2;
    display: flex;
    justify-content: flex-start;
    flex-direction: column-reverse;
    background-color: var(--theme-popup-color);
  }

  .bar {
    flex-grow: 1;
    display: flex;
    justify-content: flex-start;
    max-height: 4rem;
  }

  .component {
    flex-grow: 2;
    height: 0;
  }
</style>
