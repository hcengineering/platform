<script lang="ts">
  import { getContext } from 'svelte'
  import Mute from './icons/Mute.svelte'

  const { currentTheme, setTheme } = getContext('theme')

  const themes = ['theme-light', 'theme-grey', 'theme-dark']

  let current = themes.indexOf(currentTheme)

  function changeTheme () {
    current++
    setTheme(themes[current % themes.length])
  }
</script>

<div class="flex items-center" on:click={changeTheme}>
  <Mute size={'small'}/>
</div>
