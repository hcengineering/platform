<script lang="ts">
  export let label: string
</script>

<button class="hulyToDoLine-reference flex-row-top flex-no-shrink flex-gap-2" on:click>
  <div class="hulyToDoLine-icon">
    <slot name="icon" />
  </div>
  <span class="hulyToDoLine-label overflow-label font-medium-12 text-left max-w-20 secondary-textColor">
    {label}
  </span>
  <slot />
</button>

<style lang="scss">
  button {
    margin: 0;
    padding: 0;
    text-align: left;
    border: none;
    outline: none;
  }
</style>
