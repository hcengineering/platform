<script lang="ts">
  import { setContext } from 'svelte'

  import Notification from './Notification.svelte'
  import store, { notificationsContextKey } from './store'
  import { NotificationPosition } from './NotificationPosition'

  const getClass = (position: NotificationPosition) => {
    switch (position) {
      case NotificationPosition.BottomLeft:
        return 'bottom-left'
      case NotificationPosition.BottomRight:
        return 'bottom-right'
      case NotificationPosition.TopLeft:
        return 'top-left'
      case NotificationPosition.TopRight:
        return 'top-right'
    }
  }

  setContext(notificationsContextKey, store)
</script>

<slot></slot>
<div class="notifications">
  {#each [NotificationPosition.TopRight, NotificationPosition.TopLeft, NotificationPosition.BottomRight, NotificationPosition.BottomLeft] as position}
    <div class={getClass(position)}
      style:z-index={9999}>
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
