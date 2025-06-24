<script lang="ts">
  import { AnySvelteComponent, Icon, Label } from '@hcengineering/ui'
  import { Asset, type IntlString } from '@hcengineering/platform'
  import { ComponentType } from 'svelte'

  export let icon: Asset | AnySvelteComponent | ComponentType
  export let label: IntlString
</script>

<div class="hulyComponent-content flex-col flex-gap-4">
  <div class="flex-row-center">
    <span class="mr-2">
      <Icon {icon} size={'medium'} />
    </span>
    <span class="title">
      <Label {label} />
    </span>
  </div>
  <div class="container">
    <slot />
  </div>
</div>

<style lang="scss">
  .title {
    margin: 0.25rem;
    font-weight: 500;
    font-size: 1rem;
  }
  .container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
