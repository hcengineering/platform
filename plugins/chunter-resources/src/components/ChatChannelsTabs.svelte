<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import presentation, { createQuery } from '@hcengineering/presentation'
  import { ExternalChannel } from '@hcengineering/chunter'
  import contact, { ChannelProvider, Contact } from '@hcengineering/contact'
  import { Doc, Ref } from '@hcengineering/core'
  import { isHulyUser, personAccountByIdStore } from '@hcengineering/contact-resources'
  import { TabItem, TabList } from '@hcengineering/ui'
  import { getMetadata } from '@hcengineering/platform'
  import view from '@hcengineering/view'

  import { allChannelId, getAvailableChannelProviders, getChannelContacts, hulyChannelId } from '../utils'

  export let object: Doc
  export let selectedChannelId: Ref<ExternalChannel> | undefined = undefined

  const channelsQuery = createQuery()

  let allowedChannels: ExternalChannel[] = []
  let allowedProviders: ChannelProvider[] = []
  let contacts: Ref<Contact>[] = []

  let tabItems: TabItem[] = []

  $: void getAvailableChannelProviders(object._class).then((res) => {
    allowedProviders = res
  })

  $: contacts = getChannelContacts(object, $personAccountByIdStore)

  $: if (allowedProviders.length === 0 || contact === undefined) {
    allowedChannels = []
    channelsQuery.unsubscribe()
  } else {
    channelsQuery.query(
      contact.class.Channel,
      { attachedTo: { $in: contacts }, provider: { $in: allowedProviders.map((it) => it._id) } },
      (res) => {
        allowedChannels = res
      }
    )
  }

  $: updateTabs(allowedChannels, contacts)
  $: updateSelectedChannel(selectedChannelId, tabItems)

  function updateTabs (channels: ExternalChannel[], contacts: Ref<Contact>[]): void {
    const branding = getMetadata(presentation.metadata.Branding)
    const all: TabItem = {
      id: allChannelId,
      labelIntl: view.string.All
    }
    const huly: TabItem = {
      id: hulyChannelId,
      label: branding?.title ?? 'Huly'
    }

    const isHulyChatAllowed = contacts.length === 0 || contacts.every(isHulyUser)

    let result: TabItem[] = []

    for (const channel of channels) {
      const provider = allowedProviders.find((it) => it._id === channel.provider)
      if (provider === undefined) continue

      result.push({
        id: channel._id,
        label: channel.value,
        icon: provider.icon
      })
    }

    if (isHulyChatAllowed && result.length > 0) {
      result = [huly, ...result]
    }

    if (result.length > 1) {
      tabItems = [all, ...result]
    } else {
      tabItems = result
    }
  }

  function updateSelectedChannel (selected: Ref<ExternalChannel> | undefined, items: TabItem[]): void {
    if (selected === undefined) {
      selectedChannelId = items[0]?.id as Ref<ExternalChannel>
    }
    const available = items.find((it) => it.id === selected)

    if (available === undefined) {
      selectedChannelId = items[0]?.id as Ref<ExternalChannel>
    }
  }

  function handleSelect (event: CustomEvent): void {
    selectedChannelId = event.detail?.id
  }
</script>

{#if tabItems.length > 0}
  <TabList items={tabItems} selected={selectedChannelId} on:select={handleSelect} />
{/if}
