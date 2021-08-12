<script lang="ts">
  import { getContext } from 'svelte'
  import FontSize from './icons/FontSize.svelte'

  const { currentFontSize, setFontSize } = getContext('fontsize')

  const fontsizes = ['small-font', 'normal-font']
  let fsLabel = currentFontSize

  let current = fontsizes.indexOf(currentFontSize)

  function changeFontSize () {
    current++
    fsLabel = fontsizes[current % fontsizes.length]
    setFontSize(fontsizes[current % fontsizes.length])
  }
</script>

<div class="flex items-center" on:click={changeFontSize}>
  <FontSize size={'small'}/>
</div>
