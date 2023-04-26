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
  import FontSize from './icons/FontSize.svelte'
  import { popupstore } from '../../popups'
  import { deviceOptionsStore as deviceInfo } from '../..'

  const { currentFontSize, setFontSize } = getContext('fontsize') as {
    currentFontSize: string
    setFontSize: (size: string) => void
  }

  const fontsizes = ['small-font', 'normal-font']

  let current = fontsizes.indexOf(currentFontSize)

  function changeFontSize () {
    current++
    setFontSize(fontsizes[current % fontsizes.length])
    $popupstore = $popupstore
  }
  $: $deviceInfo.fontSize = fontsizes[current % fontsizes.length] === 'normal-font' ? 16 : 14
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="flex-center" on:click={changeFontSize}>
  <FontSize />
</div>
