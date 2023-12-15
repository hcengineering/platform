<script lang="ts">
  import { IconSize } from '@hcengineering/ui'
  import VacancyIcon from './icons/Vacancy.svelte'
  export let size: IconSize = 'small'
</script>

<div class="flex-center template-icon">
  <VacancyIcon {size} />
</div>

<style lang="scss">
  .template-icon {
    width: 100%;
    height: 100%;
  }
</style>
