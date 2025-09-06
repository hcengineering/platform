<script lang="ts">
  import { onMount } from 'svelte'
  import { showPopup, getTimeZoneName } from '../..'
  import ClockPopup from './ClockPopup.svelte'

  let hours = ''
  let minutes = ''
  let pressed: boolean = false

  function updateTime (): void {
    const date = new Date()
    const h = date.getHours()
    hours = h < 10 ? `0${h}` : h.toString()
    const m = date.getMinutes()
    minutes = m < 10 ? `0${m}` : m.toString()
  }

  onMount(() => {
    updateTime()
    const interval = setInterval(updateTime, 500)
    return () => {
      clearInterval(interval)
    }
  })
</script>

<button
  class="antiButton ghost jf-center bs-none no-focus statusButton"
  class:pressed
  on:click={() => {
    pressed = true
    showPopup(ClockPopup, {}, 'status', () => {
      pressed = false
    })
  }}
>
  {#if getTimeZoneName() !== ''}<span>{getTimeZoneName()}</span>&nbsp;&nbsp;{/if}
  <span>{hours}</span>
  <span class="blink">:</span>
  <span>{minutes}</span>
</button>

<style lang="scss">
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
  .blink {
    animation: blink 1s step-start 0s infinite;
  }
</style>
