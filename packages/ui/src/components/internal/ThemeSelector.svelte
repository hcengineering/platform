<script lang="ts">
  import { getContext } from 'svelte'
  import Mute from './icons/Mute.svelte'
  import { deviceOptionsStore as deviceInfo } from '../../'

  const { currentTheme, setTheme } = getContext('theme') as { currentTheme: string; setTheme: (theme: string) => void }

  const themes = ['theme-light', 'theme-dark']

  let current = themes.indexOf(currentTheme)
  $deviceInfo.theme = currentTheme

  function changeTheme () {
    current++
    setTheme(themes[current % themes.length])
    $deviceInfo.theme = themes[current % themes.length]
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="flex-center" on:click={changeTheme}>
  <Mute />
</div>
