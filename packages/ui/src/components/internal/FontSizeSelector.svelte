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
  import { IntlString } from '@hcengineering/platform'
  import { getContext } from 'svelte'
  import ui, { deviceOptionsStore as deviceInfo, popupstore, showPopup } from '../..'
  import FontSizePopup from './FontSizePopup.svelte'
  import FontSize from './icons/FontSize.svelte'

  const { currentFontSize, setFontSize } = getContext<{
    currentFontSize: string
    setFontSize: (value: number) => void
  }>('fontsize')

  const fontsizes: Array<{ id: string, label: IntlString, size: number }> = [
    { id: 'normal-font', label: ui.string.Spacious, size: 16 },
    { id: 'small-font', label: ui.string.Compact, size: 14 }
  ]
  let pressed: boolean = false
  let btn: HTMLButtonElement

  let current = fontsizes.findIndex((fs) => fs.id === currentFontSize)

  function changeFontSize (ev: MouseEvent) {
    pressed = true
    showPopup(FontSizePopup, { fontsizes, selected: fontsizes[current].id }, btn, (result) => {
      if (result) {
        setFontSize(result)
        current = fontsizes.findIndex((fs) => fs.id === result)
        $popupstore = $popupstore
      }
      pressed = false
    })
  }
  $: $deviceInfo.fontSize = fontsizes[current].size
</script>

<button
  bind:this={btn}
  class="antiButton ghost jf-center bs-none no-focus resetIconSize statusButton square"
  class:pressed
  style:color={'var(--theme-dark-color)'}
  on:click={changeFontSize}
>
  <FontSize />
</button>
