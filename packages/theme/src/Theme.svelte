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

  const setRootColors = (theme: string) => {
    document.documentElement.setAttribute('class', `${theme} ${getCurrentFontSize()}`)
    themeOptions.set(
      new ThemeOptions(getCurrentFontSize() === 'normal-font' ? 16 : 14, getCurrentTheme() === 'theme-dark')
    )
  }
  const setRootFontSize = (fontsize: string) => {
    document.documentElement.setAttribute('class', `${getCurrentTheme()} ${fontsize}`)
    themeOptions.set(new ThemeOptions(fontsize === 'normal-font' ? 16 : 14, getCurrentTheme() === 'theme-dark'))
  }

  setContext('theme', {
    currentTheme,
    setTheme: (name: string) => {
      localStorage.setItem('theme', name)
      setRootColors(name)
    }
  })
  setContext('fontsize', {
    currentFontSize,
    setFontSize: (fontsize: string) => {
      localStorage.setItem('fontsize', fontsize)
      setRootFontSize(fontsize)
    }
  })
  setContext('lang', {
    currentLanguage,
    setLanguage: (lang: string) => {
      currentLanguage = lang
      localStorage.setItem('lang', lang)
      location.reload()
    }
  })

  const setDocumentLanguage = (): void => {
    document.documentElement.lang = currentLanguage
  }

  onMount(() => {
    setRootColors(currentTheme)
    setRootFontSize(currentFontSize)
    setMetadata(platform.metadata.locale, currentLanguage)
    loadPluginStrings(currentLanguage)
    setDocumentLanguage()
  })
</script>

<slot />
