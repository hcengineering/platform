<script lang="ts">
  import { Icon, IconSize } from '@hcengineering/ui'
  import IconFolder from './icons/Folder.svelte'

  export let size: IconSize = 'small'
  export let fill: string | undefined = undefined
</script>

<div class="flex-center template-icon">
  <Icon icon={IconFolder} {size} {fill} />
</div>

<style lang="scss">
  .template-icon {
    width: 100%;
    height: 100%;
  }
</style>
