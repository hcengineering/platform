<script lang="ts">
  import { getContext } from 'svelte'
  import FontSize from './icons/FontSize.svelte'
  import Tooltip from '../Tooltip.svelte'

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

<div class="fs-container" on:click={changeFontSize}>
  <Tooltip label={fsLabel} direction={'bottom'}>
    <FontSize size={'small'}/>
  </Tooltip>
</div>

<style lang="scss">
  .fs-container {
    display: flex;
    align-items: center;
    height: 56px;
  }
</style>