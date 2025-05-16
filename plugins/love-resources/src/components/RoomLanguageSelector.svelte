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
  import { getClient } from '@hcengineering/presentation'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { DropdownIntlItem, DropdownLabelsIntl, DropdownLabelsPopupIntl, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { Room, RoomLanguage } from '@hcengineering/love'

  import { languagesDisplayData } from '../types'
  import LanguageIcon from './LanguageIcon.svelte'
  import { updateSessionLanguage } from '../utils'

  export let room: Room
  export let kind: 'dropdown' | 'icon' = 'dropdown'

  const client = getClient()

  let container: HTMLElement
  let selectedItem: RoomLanguage = room.language
  $: selectedItem = room.language

  let items: DropdownIntlItem[] = []
  $: items = Object.entries(languagesDisplayData).map(([lang, data]) => ({
    id: lang,
    label: getEmbeddedLabel(data.label),
    icon: LanguageIcon,
    iconProps: { lang }
  }))

  async function handleSelection (newLang?: RoomLanguage): Promise<void> {
    if (newLang == null) return

    await client.diffUpdate(room, { language: newLang })
    await updateSessionLanguage(room)
  }

  function showLanguagesPopup (): void {
    showPopup(DropdownLabelsPopupIntl, { items, selected: selectedItem }, container, async (result) => {
      if (result != null && result !== '') {
        selectedItem = result
        await handleSelection(result)
      }
    })
  }
</script>

{#if kind === 'dropdown'}
  <DropdownLabelsIntl
    {items}
    kind="regular"
    size="large"
    icon={LanguageIcon}
    iconProps={{ lang: selectedItem }}
    bind:selected={selectedItem}
    label={view.string.AddSavedView}
    on:selected={(e) => handleSelection(e.detail)}
  />
{:else}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="iconSelector" on:click={showLanguagesPopup} bind:this={container}>
    <LanguageIcon lang={selectedItem} size="medium" />
  </div>
{/if}

<style lang="scss">
  .iconSelector {
    display: flex;
    cursor: pointer;
  }
</style>
