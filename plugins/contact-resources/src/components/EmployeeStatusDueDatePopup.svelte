<script lang="ts">
  import { Icon, IconDPCalendarOver, IconDPCalendar, Label } from '@hcengineering/ui'
  import contact from '../plugin'

  export let isOverdue: boolean = false
  export let formattedDate: string | undefined
</script>

<div class="iconContainer">
  <Icon icon={isOverdue ? IconDPCalendarOver : IconDPCalendar} size={'full'} />
  {#if formattedDate}
    <div>{formattedDate}</div>
  {:else}
    <Label label={contact.string.NoExpire} />
  {/if}
</div>

<style lang="scss">
  .iconContainer {
    color: var(--content-color);
    margin-right: 1rem;
  }
</style>
