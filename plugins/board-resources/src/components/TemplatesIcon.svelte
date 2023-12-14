<script lang="ts">
  import { Icon, IconSize } from '@hcengineering/ui'
  import board from '@hcengineering/board'
  export let size: IconSize = 'small'
</script>

<div class="flex-center template-icon">
  <Icon icon={board.icon.Board} {size} />
</div>

<style lang="scss">
  .template-icon {
    width: 100%;
    height: 100%;
  }
</style>
