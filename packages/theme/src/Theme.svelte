<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import platform, { loadPluginStrings, setMetadata } from '@hcengineering/platform'
  import { onMount, setContext } from 'svelte'
  import { ThemeOptions, getCurrentFontSize, getCurrentLanguage, getCurrentTheme, themeStore as themeOptions } from './'

  const currentTheme = getCurrentTheme()
  const currentFontSize = getCurrentFontSize()
  let currentLanguage = getCurrentLanguage()

  const setOptions = (currentFont: string, theme: string, language: string) => {
    themeOptions.set(new ThemeOptions(currentFont === 'normal-font' ? 16 : 14, theme === 'theme-dark', language))
  }

  const setRootColors = (theme: string, set = true) => {
    if (set) {
      localStorage.setItem('theme', theme)
    }
    document.documentElement.setAttribute('class', `${theme} ${getCurrentFontSize()}`)
    setOptions(getCurrentFontSize(), theme, getCurrentLanguage())
  }
  const setRootFontSize = (fontsize: string, set = true) => {
    if (set) {
      localStorage.setItem('fontsize', fontsize)
    }
    document.documentElement.setAttribute('class', `${getCurrentTheme()} ${fontsize}`)
    setOptions(fontsize, getCurrentTheme(), getCurrentLanguage())
  }
  const setLanguage = async (language: string, set: boolean = true) => {
    currentLanguage = language
    if (set) {
      localStorage.setItem('lang', language)
    }
    setMetadata(platform.metadata.locale, currentLanguage)
    await loadPluginStrings(currentLanguage, set)
    setOptions(getCurrentFontSize(), getCurrentTheme(), language)
  }

  setContext('theme', {
    currentTheme,
    setTheme: setRootColors
  })
  setContext('fontsize', {
    currentFontSize,
    setFontSize: setRootFontSize
  })
  setContext('lang', {
    currentLanguage,
    setLanguage
  })

  const setDocumentLanguage = (): void => {
    document.documentElement.lang = currentLanguage
  }

  onMount(() => {
    setRootColors(currentTheme, false)
    setRootFontSize(currentFontSize, false)
    setLanguage(currentLanguage, false)
    loadPluginStrings(currentLanguage)
    setDocumentLanguage()
  })
</script>

<slot />
