<script lang="ts">
  import { getContext } from 'svelte'
  import { IntlString } from '@hcengineering/platform'
  import ui, { showPopup, deviceOptionsStore as deviceInfo } from '../..'
  import Theme from './icons/Theme.svelte'
  import ThemePopup from './ThemePopup.svelte'
  import { isSystemThemeDark } from '@hcengineering/theme'

  const { currentTheme, setTheme } = getContext<{ currentTheme: string, setTheme: (theme: string) => void }>('theme')

  const themes: Array<{ id: string, label: IntlString }> = [
    { id: 'theme-light', label: ui.string.ThemeLight },
    { id: 'theme-dark', label: ui.string.ThemeDark },
    { id: 'theme-system', label: ui.string.ThemeSystem }
  ]
  let pressed: boolean = false
  let remove: any = null

  let current = themes.findIndex((th) => th.id === currentTheme)

  function changeTheme (ev: MouseEvent) {
    pressed = true
    showPopup(ThemePopup, { themes, selected: themes[current].id }, 'status', (result) => {
      if (result) {
        setTheme(result)
        current = themes.findIndex((th) => th.id === result)
      }
      pressed = false
    })
  }
  $: $deviceInfo.theme = themes[current].id
  $: if (themes[current].id === 'theme-system') checkSystemTheme()

  const checkSystemTheme = () => {
    if (remove !== null || themes[current].id !== 'theme-system') remove()
    const isDark = isSystemThemeDark()
    const media = matchMedia(`(prefers-color-scheme: ${isDark ? 'light' : 'dark'})`)
    setTheme(themes[current].id)
    media.addEventListener('change', checkSystemTheme)
    remove = () => {
      media.removeEventListener('change', checkSystemTheme)
    }
  }
</script>

<button
  class="antiButton ghost jf-center bs-none no-focus resetIconSize statusButton square"
  class:pressed
  style:color={'var(--theme-dark-color)'}
  on:click={changeTheme}
>
  <Theme />
</button>
