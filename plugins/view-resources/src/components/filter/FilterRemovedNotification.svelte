<script lang="ts">
  import { Button, IconClose, Notification } from '@hcengineering/ui'
  import { fade } from 'svelte/transition'

  export let onRemove: () => void
  export let notification: Notification

  const { title, params } = notification
</script>

<div class="root" in:fade out:fade>
  <div class="content">
    <div class="title">
      {title}
    </div>
    <div class="row">
      {params?.description}
    </div>
  </div>
  <div class="close-button">
    <Button icon={IconClose} kind="ghost" size="small" on:click={onRemove} />
  </div>
</div>

<style lang="scss">
  .root {
    position: relative;
    display: flex;
    margin: 10px;
    box-shadow: 0 4px 10px var(--divider-color);
    height: 100px;
    width: 400px;
    overflow: hidden;
    color: var(--caption-color);
    background-color: var(--theme-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 6px;
    padding: 10px;
  }

  .content {
    margin-left: 10px;
  }

  .title {
    display: flex;
    align-items: center;
    color: var(--caption-color);
    font-weight: 500;
    margin-bottom: 10px;
  }

  .close-button {
    position: absolute;
    top: 5px;
    right: 5px;
  }

  .row {
    display: flex;
    align-items: center;
  }
</style>
