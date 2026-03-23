<script lang="ts">
  import { ActivityMessage } from '@hcengineering/activity'

  import ActivityMessagePresenter from './ActivityMessagePresenter.svelte'

  export let value: ActivityMessage
</script>

<div class="hulyPopup-container autoWidth scroll" style:minWidth="20rem" style:maxWidth="40rem">
  <ActivityMessagePresenter {value} withActions={false} hoverable={false} withShowMore={false} skipLabel />
</div>

<style lang="scss">
  .scroll {
    flex-grow: 1;
    min-height: 0;
    height: max-content;
    overflow-x: hidden;
    overflow-y: auto;
  }
</style>
