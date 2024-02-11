<script lang="ts">
  import { onDestroy } from 'svelte'
  import { showPopup, getTimeZoneName } from '../..'
  import ClockPopup from './ClockPopup.svelte'

  let hours = ''
  let minutes = ''
  let delimiter: boolean = false
  let pressed: boolean = false

  function updateTime () {
    const date = new Date()
    const h = date.getHours()
    hours = h < 10 ? `0${h}` : h.toString()
    const m = date.getMinutes()
    minutes = m < 10 ? `0${m}` : m.toString()
    delimiter = !delimiter
  }

  const interval = setInterval(updateTime, 500)
  updateTime()

  onDestroy(() => {
    clearInterval(interval)
  })
</script>

<button
  class="antiButton ghost jf-center bs-none no-focus statusButton"
  class:pressed
  on:click={(ev) => {
    pressed = true
    showPopup(ClockPopup, {}, 'status', () => {
      pressed = false
    })
  }}
>
  {#if getTimeZoneName() !== ''}<span>{getTimeZoneName()}</span>&nbsp;&nbsp;{/if}
  <span>{hours}</span>
  <span style:visibility={delimiter ? 'visible' : 'hidden'}>:</span>
  <span>{minutes}</span>
</button>
