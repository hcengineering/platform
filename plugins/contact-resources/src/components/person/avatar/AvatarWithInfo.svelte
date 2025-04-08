<style lang="scss">
  .avatar {
    width: 5rem;
    height: 5rem;
    position: relative;
    border-radius: 0.75rem;
    overflow: hidden;

    :global(img) {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .avatar-user-status {
    width: 0.875rem;
    height: 0.875rem;
    right: 0.125rem;
    bottom: 0.125rem;
    position: absolute;
    border-radius: 50%;
    z-index: 1;
  }

  .status-indicator {
    width: 100%;
    height: 100%;
    background: var(--fill-positive-1, #209b18);
    border-radius: 50%;
    box-shadow: 0 0 0 0.125rem var(--theme-bg-color);
  }
</style>
