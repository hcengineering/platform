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
  import { createEventDispatcher } from 'svelte'
  import presentation from '@hcengineering/presentation'
  import { ButtonWithDropdown, SelectPopupValueType, IconDropdown, Button } from '@hcengineering/ui'
  import { getEmbeddedLabel, getMetadata } from '@hcengineering/platform'
  import { ChannelProvider } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { ExternalChannel } from '@hcengineering/chunter'
  import { IntegrationType } from '@hcengineering/setting'
  import textEditor, { SendIcon } from '@hcengineering/text-editor'

  import { hulyChannelId } from '../../utils'

  export let loading = false
  export let canSubmit = true
  export let providers: ChannelProvider[]
  export let channels: ExternalChannel[]
  export let selectedChannelId: Ref<ExternalChannel> | undefined
  export let allowHulyChat = true
  export let showLabel = true

  const dispatch = createEventDispatcher()

  let selectedChannel: ExternalChannel | undefined
  let selectedItem: SelectPopupValueType | undefined

  let items: (SelectPopupValueType & { type?: Ref<IntegrationType> })[] = []

  $: selectedItem = items.find((it) => it.id === selectedChannelId)

  $: updateItems(channels, providers, allowHulyChat)
  $: updateSelectedData(selectedChannelId, providers, channels)

  function updateSelectedData (
    selectedChannelId: Ref<ExternalChannel> | undefined,
    providers: ChannelProvider[],
    channels: ExternalChannel[]
  ): void {
    if (selectedChannelId === hulyChannelId) {
      selectedChannel = undefined
      return
    }

    selectedChannel = channels.find((it) => it._id === selectedChannelId)

    const provider = providers.find((it) => it._id === selectedChannel?.provider)

    if (provider === undefined) {
      selectedChannel = undefined
      selectedItem = items[0]
    }
  }

  function updateItems (
    externalChannels: ExternalChannel[],
    providers: ChannelProvider[],
    allowHulyChat: boolean
  ): void {
    let result: (SelectPopupValueType & { type?: Ref<IntegrationType> })[] = []

    for (const channel of externalChannels) {
      const provider = providers.find((it) => it._id === channel.provider)

      if (provider === undefined) continue

      const type = provider.integrationType as Ref<IntegrationType> | undefined

      if (type === undefined) continue

      result.push({
        id: channel._id,
        icon: provider.icon,
        type,
        text: channel.value
      })
    }

    result.sort((item1, item2) => {
      if (item1.type !== item2.type) {
        return (item1.type ?? '').localeCompare(item2.type ?? '')
      }

      return (item1.text ?? '').localeCompare(item2.text ?? '')
    })

    if (allowHulyChat) {
      const branding = getMetadata(presentation.metadata.Branding)
      result = [{ id: hulyChannelId, text: branding?.title ?? 'Huly', icon: SendIcon }, ...result]
    }

    items = result

    if (selectedItem === undefined && items.length > 0) {
      selectedChannelId = items[0].id as Ref<ExternalChannel>
      selectedItem = items[0]
    }
  }

  function handleClick (): void {
    dispatch('submit')
  }

  function handleSelect (ev: CustomEvent): void {
    const detail = ev.detail

    if (detail != null) {
      selectedChannelId = detail
    }
  }

  $: label = selectedItem?.text ? getEmbeddedLabel(selectedItem.text) : textEditor.string.Send
</script>

{#if items.length > 1}
  <ButtonWithDropdown
    {label}
    icon={selectedItem?.icon}
    {loading}
    mainButtonDisabled={!canSubmit}
    dropdownItems={items}
    dropdownIcon={IconDropdown}
    size="small"
    kind="regular"
    fullWidth={false}
    showTooltipMain={{ label }}
    on:click={handleClick}
    on:dropdown-selected={handleSelect}
  />
{:else}
  <Button
    {loading}
    label={allowHulyChat || !showLabel ? undefined : label}
    disabled={!canSubmit}
    icon={SendIcon}
    iconProps={{ size: 'small' }}
    kind={allowHulyChat ? 'ghost' : 'regular'}
    size="small"
    showTooltip={{
      label: textEditor.string.Send
    }}
    on:click={handleClick}
  />
{/if}
