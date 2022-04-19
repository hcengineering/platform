<script lang="ts">
  import { Ref, Space } from '@anticrm/core'
  import { Button, showPopup } from '@anticrm/ui'
  import tracker from '../plugin'
  import CreateIssue from './CreateIssue.svelte'
  export let currentSpace: Ref<Space>

  async function newIssue (target: EventTarget | null): Promise<void> {
    showPopup(CreateIssue, { space: currentSpace }, 'top')
  }
</script>

<div class="antiNav-subheader gap-2">
  <div class="flex-grow text-md">
    <Button
      icon={tracker.icon.NewIssue}
      label={tracker.string.NewIssue}
      justify={'left'}
      width={'100%'}
      on:click={() => newIssue(null)}
    />
  </div>
  <Button icon={tracker.icon.Magnifier} on:click={async () => {}} />
</div>
