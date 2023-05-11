<script lang="ts">
  import { FocusManager } from '../focus'

  export let manager: FocusManager
  export let isEnabled: boolean = true

  function handleKey (evt: KeyboardEvent): void {
    if (evt.code === 'Tab' && isEnabled) {
      evt.preventDefault()
      evt.stopPropagation()
      manager.next(evt.shiftKey ? -1 : 1)
    }
  }
</script>

<svelte:window on:keydown={(evt) => handleKey(evt)} />
<slot />
