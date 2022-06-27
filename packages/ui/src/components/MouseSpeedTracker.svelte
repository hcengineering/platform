<script lang="ts" context="module">
  import { readable } from 'svelte/store'
  const ticker = readable(Date.now(), (set) => {
    setInterval(() => {
      set(Date.now())
    }, 100)
  })
</script>

<script lang="ts">
  export let focusSpeed: boolean

  let timestamp: number = 0
  let lastMouseX: number = 0
  let lastMouseY: number = 0

  let speedX: number
  let speedY: number
  let speedD: number

  let maxSpeedX: number
  let maxSpeedY: number
  let maxSpeedD: number

  $: focusSpeed = speedD < 50

  function update (now: number) {
    maxSpeedY = 0
    maxSpeedX = 0
    maxSpeedD = 0
  }

  $: update($ticker)

  function trackMouse (evt: MouseEvent): void {
    if (timestamp === 0) {
      timestamp = Date.now()
      lastMouseX = evt.screenX
      lastMouseY = evt.screenY
      return
    }

    const now = Date.now()
    const dt = now - timestamp
    const dx = evt.screenX - lastMouseX
    const dy = evt.screenY - lastMouseY
    speedX = Math.round((dx / dt) * 100)
    speedY = Math.round((dy / dt) * 100)

    speedD = Math.round(Math.sqrt(speedX * speedX + speedY * speedY))

    if (speedX > maxSpeedX) {
      maxSpeedX = speedX
    }
    if (speedY > maxSpeedY) {
      maxSpeedY = speedY
    }
    if (speedD > maxSpeedD) {
      maxSpeedD = speedD
    }

    timestamp = now
    lastMouseX = evt.screenX
    lastMouseY = evt.screenY
  }
</script>

<svelte:window on:mousemove={trackMouse} />
