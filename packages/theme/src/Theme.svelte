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
  import { setContext, onMount } from 'svelte'
  import platform, { loadPluginStrings, setMetadata } from '@anticrm/platform'
  import { themeStore as themeOptions } from './'

  const getCurrentTheme = (): string => localStorage.getItem('theme') ?? 'theme-dark'
  const getCurrnetFontSize = (): string => localStorage.getItem('fontsize') ?? 'normal-font'
  const getCurrnetLanguage = (): string => localStorage.getItem('lang') ?? 'en'
  const currentTheme = getCurrentTheme()
  const currentFontSize = getCurrnetFontSize()
  let currentLanguage = getCurrnetLanguage()

  const setRootColors = (theme: string) => {
    document.documentElement.setAttribute('class', `${theme} ${getCurrnetFontSize()}`)
  }
  const setRootFontSize = (fontsize: string) => {
    document.documentElement.setAttribute('class', `${getCurrentTheme()} ${fontsize}`)
    themeOptions.update((opt) => {
      return { ...opt, fontSize: fontsize === 'normal-font' ? 16 : 14 }
    })
  }

  setContext('theme', {
    currentTheme: currentTheme,
    setTheme: (name: string) => {
      setRootColors(name)
      localStorage.setItem('theme', name)
    }
  })
  setContext('fontsize', {
    currentFontSize: currentFontSize,
    setFontSize: (fontsize: string) => {
      setRootFontSize(fontsize)
      localStorage.setItem('fontsize', fontsize)
    }
  })
  setContext('lang', {
    currentLanguage: currentLanguage,
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
