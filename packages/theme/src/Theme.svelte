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

  const getCurrentTheme = (): string => localStorage.getItem('theme') ?? 'theme-dark'
  const getCurrnetFontSize = (): string => localStorage.getItem('fontsize') ?? 'normal-font'
  const currentTheme = getCurrentTheme()
  const currentFontSize = getCurrnetFontSize()

  const setRootColors = (theme: string) => {
    document.body.setAttribute('class', `${theme} ${getCurrnetFontSize()}`)
  }
  const setRootFontSize = (fontsize: string) => {
    document.body.setAttribute('class', `${getCurrentTheme()} ${fontsize}`)
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

  onMount(() => {
    setRootColors(currentTheme)
    setRootFontSize(currentFontSize)
  })
</script>

<slot/>
