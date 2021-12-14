<script lang="ts">
  import { Icon } from '@anticrm/ui'
  import task from '@anticrm/task'
</script>

<div class="root">
  <Icon icon={task.icon.Task} size="xsmall" />
</div>

<style lang="scss">
  .root {
    display: flex;
    align-items: center;
    justify-content: center;

    width: 100%;
    height: 100%;
    color: #fff;
    background-color: #7C6FCD;
  }
</style>