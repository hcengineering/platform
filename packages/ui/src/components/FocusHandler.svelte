<script lang="ts">
  import { FocusManager } from '../focus'

  export let manager: FocusManager
  export let isEnabled: boolean = true

  function handleKey (evt: KeyboardEvent): void {
    if (evt.code === 'Tab' && isEnabled) {
      const result = manager.next(evt.shiftKey ? -1 : 1)
      if (result) {
        evt.preventDefault()
        evt.stopPropagation()
      }
    }
  }
</script>

<svelte:window on:keydown={(evt) => handleKey(evt)} />
<slot />
