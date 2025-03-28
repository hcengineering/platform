<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { type IntlString, getMetadata } from '@hcengineering/platform'
  import { getContext } from 'svelte'

  import FontSize from './icons/FontSize.svelte'
  import Language from './icons/Language.svelte'

  import ThemeButton from './ThemeButton.svelte'
  import ui, {
    Html,
    Icon,
    Label,
    ModernPopup,
    showPopup,
    deviceOptionsStore as deviceInfo,
    eventToHTMLElement
  } from '../..'

  const fontSizeContext = getContext<{ currentFontSize: string, setFontSize: (value: string) => void }>('fontsize')
  const setFontSize = fontSizeContext.setFontSize
  let currentFontSize = fontSizeContext.currentFontSize

  const themeContext = getContext<{ currentTheme: string, setTheme: (theme: string) => void }>('theme')
  const setTheme = themeContext.setTheme
  let currentTheme = themeContext.currentTheme

  const languageContext = getContext<{ currentLanguage: string, setLanguage: (language: string) => void }>('lang')
  const setLanguage = languageContext.setLanguage
  let currentLanguage = languageContext.currentLanguage

  const fontsizes: Array<{ id: string, label: IntlString, size: number }> = [
    { id: 'normal-font', label: ui.string.Spacious, size: 16 },
    { id: 'small-font', label: ui.string.Compact, size: 14 }
  ]

  const themes: Array<{ id: string, label: IntlString }> = [
    { id: 'theme-light', label: ui.string.ThemeLight },
    { id: 'theme-dark', label: ui.string.ThemeDark },
    { id: 'theme-system', label: ui.string.ThemeSystem }
  ]

  const uiLangs = new Set(getMetadata(ui.metadata.Languages))
  const langs = [
    { id: 'en', label: ui.string.English, logo: '&#x1F1FA;&#x1F1F8;' },
    { id: 'pt', label: ui.string.Portuguese, logo: '&#x1F1F5;&#x1F1F9;' },
    { id: 'es', label: ui.string.Spanish, logo: '&#x1F1EA;&#x1F1F8;' },
    { id: 'ru', label: ui.string.Russian, logo: '&#x1F1F7;&#x1F1FA;' },
    { id: 'zh', label: ui.string.Chinese, logo: '&#x1F1E8;&#x1F1F3;' },
    { id: 'fr', label: ui.string.French, logo: '&#x1F1EB;&#x1F1F7;' },
    { id: 'it', label: ui.string.Italian, logo: '&#x1F1EE;&#x1F1F9;' },
    { id: 'cs', label: ui.string.Czech, logo: '&#x1F1E8;&#x1F1FF;' },
    { id: 'de', label: ui.string.German, logo: '&#x1F1E9;&#x1F1EA;' }
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

  function selectFontSize (size: string): void {
    if (currentFontSize === size) return
    currentFontSize = size
    setFontSize(size)
  }

  function selectTheme (theme: string): void {
    if (currentTheme === theme) return
    currentTheme = theme
    setTheme(theme)
  }

  function selectLanguage (language: string): void {
    if (currentLanguage === language) return
    currentLanguage = language
    setLanguage(language)
  }

  $: $deviceInfo.fontSize = fontsize.size
  $: $deviceInfo.theme = currentTheme
  $: fontsize = fontsizes.find((fs) => fs.id === currentFontSize) ?? fontsizes[0]
  $: language = langs.find((lang) => lang.id === currentLanguage) ?? langs[0]
</script>

<div class="antiPopup">
  <div class="ap-scroll">
    <div class="ap-box">
      <div class="flex-row-center m-4">
        {#each themes as theme}
          {@const selected = currentTheme === theme.id}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            class="statusPopup-option"
            class:selected
            on:click={() => {
              selectTheme(theme.id)
            }}
          >
            <ThemeButton theme={theme.id} focused={currentTheme} />
            <span class="label overflow-label">
              <Label label={theme.label} />
            </span>
          </div>
        {/each}
      </div>

      <div class="ap-menuItem separator halfMargin" />

      <button
        class="ap-menuItem antiPopup-submenu withIcon flex-row-center flex-grow"
        on:click={(ev) => {
          const items = fontsizes.map((p) => {
            return {
              ...p,
              icon: FontSize,
              iconProps: {
                size: p.size
              }
            }
          })
          showPopup(ModernPopup, { items, selected: fontsize.id }, eventToHTMLElement(ev), (id) => {
            if (id !== undefined) {
              selectFontSize(id)
            }
          })
        }}
      >
        <div class="flex-between flex-grow">
          <div class="flex-row-center">
            <div class="icon mr-2"><FontSize size={'16px'} /></div>
            <span class="label font-medium"><Label label={ui.string.FontSize} /></span>
          </div>
          <div class="flex-row-center pr-4">
            <Label label={fontsize.label} />
          </div>
        </div>
      </button>

      <div class="ap-menuItem separator halfMargin" />

      <button
        class="ap-menuItem antiPopup-submenu withIcon flex-row-center flex-grow"
        on:click={(ev) => {
          const items = langs.map((p) => {
            return {
              ...p,
              icon: Html,
              iconProps: {
                value: p.logo
              }
            }
          })
          showPopup(ModernPopup, { items, selected: language.id }, eventToHTMLElement(ev), (id) => {
            if (id !== undefined) {
              selectLanguage(id)
            }
          })
        }}
      >
        <div class="flex-between flex-grow">
          <div class="flex-row-center">
            <div class="icon mr-2"><Icon icon={Language} size={'small'} /></div>
            <span class="label font-medium"><Label label={ui.string.Language} /></span>
          </div>
          <div class="flex-row-center pr-4">
            <div class="label text-lgd">
              <Html value={language.logo} />
            </div>
          </div>
        </div>
      </button>
    </div>
  </div>
</div>
