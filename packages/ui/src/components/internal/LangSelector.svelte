<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { getContext } from 'svelte'
  import { getMetadata } from '@hcengineering/platform'
  import { showPopup } from '../..'
  import LangPopup from './LangPopup.svelte'
  import ui from '../../plugin'

  import Flags from './icons/Flags.svelte'

  const { currentLanguage, setLanguage } = getContext('lang') as {
    currentLanguage: string
    setLanguage: (lang: string) => void
  }
  const uiLangs = new Set(getMetadata(ui.metadata.Languages))
  const langs = [
    { id: 'en', label: ui.string.English },
    { id: 'ru', label: ui.string.Russian }
  ].filter((lang) => uiLangs.has(lang.id))

  if (langs.findIndex((l) => l.id === currentLanguage) < 0 && langs.length !== 0) {
    setLanguage(langs[0].id)
  }

  if (langs.length === 0) {
    console.error(
      `List of configured UI languages: [${getMetadata(ui.metadata.Languages)?.join(
        ', '
      )}] doesn't contain any languages available in the app. Please check you configuration.`
    )
  }

  const isSelectable = langs.length > 1

  $: selected = langs.find((item) => item.id === currentLanguage)
  let trigger: HTMLElement

  const selectLanguage = (): void => {
    if (!isSelectable) {
      return
    }

    showPopup(LangPopup, { langs }, trigger, (result) => {
      if (result) {
        selected = langs.find((item) => item.id === result)
        setLanguage(result)
      }
    })
  }
</script>

<Flags />
{#if selected}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div bind:this={trigger} class="flex-center {isSelectable ? 'cursor-pointer' : ''}" on:click={selectLanguage}>
    <svg class="svg-16px">
      <use href="#{selected.id}-flag" />
    </svg>
  </div>
{/if}
