<script lang="ts">
  import { Icon, IconDPCalendarOver, IconDPCalendar } from '@anticrm/ui'

  export let isOverdue: boolean = false
  export let formattedDate: string = ''
</script>

<div class="iconContainer">
  <Icon icon={isOverdue ? IconDPCalendarOver : IconDPCalendar} size={'full'} />
  <div>{formattedDate}</div>
</div>

<style lang="scss">
  .iconContainer {
    color: var(--content-color);
    margin-right: 1rem;
  }
</style>
