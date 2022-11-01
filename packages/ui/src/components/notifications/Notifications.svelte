<script lang="ts">
  import Notification from './Notification.svelte'
  import { NotificationPosition } from './NotificationPosition'
  import store from './store'

  const positionByClassName = {
    'bottom-left': NotificationPosition.BottomLeft,
    'bottom-right': NotificationPosition.BottomRight,
    'top-left': NotificationPosition.TopLeft,
    'top-right': NotificationPosition.TopRight
  }
</script>

<slot />
<div class="notifications">
  {#each Object.entries(positionByClassName) as [className, position]}
    <div class={className} style:z-index={9999}>
      {#each $store as notification (notification.id)}
        {#if notification.position === position}
          <Notification {notification} />
        {/if}
      {/each}
    </div>
  {/each}
</div>

<style lang="scss">
  .top-left {
    position: fixed;
    top: 0;
    left: 0;
  }

  .top-right {
    position: fixed;
    top: 0;
    right: 0;
  }

  .bottom-left {
    position: fixed;
    bottom: 0;
    left: 0;
  }

  .bottom-right {
    position: fixed;
    bottom: 0;
    right: 0;
  }
</style>
