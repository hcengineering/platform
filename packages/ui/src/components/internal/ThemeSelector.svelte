<script lang="ts">
  import { getContext } from 'svelte'
  import Mute from './icons/Mute.svelte'
  import { deviceOptionsStore as deviceInfo } from '../../'

  const { currentTheme, setTheme } = getContext('theme')

  const themes = ['theme-light', 'theme-dark']

  let current = themes.indexOf(currentTheme)
  $deviceInfo.theme = currentTheme

  function changeTheme () {
    current++
    setTheme(themes[current % themes.length])
    $deviceInfo.theme = themes[current % themes.length]
  }
</script>

<div class="flex-center" on:click={changeTheme}>
  <Mute size={'small'} />
</div>
