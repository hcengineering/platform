<script lang="ts">
  import { getContext } from 'svelte'
  import FontSize from './icons/FontSize.svelte'

  const { currentFontSize, setFontSize } = getContext('fontsize')

  const fontsizes = ['small-font', 'normal-font']

  let current =  fontsizes.indexOf(currentFontSize)

  function changeFontSize () {
    current++
    setFontSize(fontsizes[current % fontsizes.length])
  }
</script>

<div class="container" on:click={changeFontSize}>
  <FontSize size={'small'}/>
</div>

<style lang="scss">
  .container {
    display: flex;
    align-items: center;
    height: 56px;
  }
</style>