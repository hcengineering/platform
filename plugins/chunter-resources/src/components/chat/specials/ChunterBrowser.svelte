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
  import chunter from '@hcengineering/chunter'
  import { FileBrowser } from '@hcengineering/attachment-resources'
  import { Scroller, Switcher } from '@hcengineering/ui'
  import type { AnySvelteComponent } from '@hcengineering/ui'
  import contact from '@hcengineering/contact'
  import contactPlg from '@hcengineering/contact-resources/src/plugin'
  import { EmployeeBrowser } from '@hcengineering/contact-resources'
  import MessagesBrowser from './MessagesBrowser.svelte'
  import { FilterBar, FilterButton } from '@hcengineering/view-resources'
  import { Class, Doc, Ref } from '@hcengineering/core'

  import { userSearch } from '../../../index'
  import { SearchType } from '../../../utils'
  import plugin from '../../../plugin'
  import Header from '../../Header.svelte'

  let userSearch_: string = ''
  userSearch.subscribe((v) => (userSearch_ = v))

  const saved = localStorage.getItem('chunter-browser-st')
  let searchType: SearchType = saved ? parseInt(saved, 10) : SearchType.Messages
  $: localStorage.setItem('chunter-browser-st', searchType.toString())

  const components: {
    component: AnySvelteComponent
    searchType: SearchType
    filterClass?: Ref<Class<Doc>>
    props?: Record<string, any>
  }[] = [
    { searchType: SearchType.Messages, component: MessagesBrowser },
    {
      searchType: SearchType.Files,
      component: FileBrowser,
      props: {
        requestedSpaceClasses: [plugin.class.Channel, plugin.class.DirectMessage]
      }
    },
    { searchType: SearchType.Contacts, component: EmployeeBrowser, filterClass: contactPlg.mixin.Employee }
  ]
  let searchValue: string = ''
</script>

<Header
  icon={plugin.icon.ChunterBrowser}
  intlLabel={plugin.string.ChunterBrowser}
  titleKind={'breadcrumbs'}
  bind:searchValue
  adaptive={'freezeActions'}
>
  <svelte:fragment slot="search">
    <FilterButton _class={components[searchType].filterClass} />
  </svelte:fragment>
  <svelte:fragment slot="actions">
    <Switcher
      name={'browser_group'}
      kind={'subtle'}
      selected={searchType}
      items={[
        {
          id: SearchType.Messages,
          icon: chunter.icon.Messages,
          labelIntl: plugin.string.Messages,
          tooltip: plugin.string.Messages
        },
        {
          id: SearchType.Files,
          icon: attachment.icon.FileBrowser,
          labelIntl: attachment.string.Files,
          tooltip: attachment.string.Files
        },
        {
          id: SearchType.Contacts,
          icon: contact.icon.Contacts,
          labelIntl: contactPlg.string.Contacts,
          tooltip: contactPlg.string.Contacts
        }
      ]}
      on:select={(result) => {
        if (result !== undefined && result.detail.id !== undefined) searchType = result.detail.id
      }}
    />
  </svelte:fragment>
</Header>
{#if components[searchType].filterClass !== undefined}
  <FilterBar
    _class={components[searchType].filterClass}
    space={undefined}
    query={{ $search: searchValue }}
    hideSaveButtons
  />
{/if}

{#if components[searchType].component}
  <Scroller>
    <svelte:component
      this={components[searchType].component}
      withHeader={false}
      search={userSearch_}
      {...components[searchType].props}
    />
  </Scroller>
{/if}

<style lang="scss">
  .browser {
    flex-grow: 2;
    display: flex;
    justify-content: flex-start;
    flex-direction: column-reverse;
    background-color: var(--theme-panel-color);
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
