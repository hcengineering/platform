<script lang="ts">
  import { Ref, Space } from '@anticrm/core'
  import ui, { ActionIcon, Button, IconEdit, IconSearch, showPopup } from '@anticrm/ui'
  import tracker from '../plugin'
  import CreateIssue from './CreateIssue.svelte'
  export let currentSpace: Ref<Space>

  async function newIssue(target: EventTarget | null): Promise<void> {
    showPopup(CreateIssue, { space: currentSpace }, target as HTMLElement)
  }
</script>

<div class="flex-between mt-4 mb-4">
  <div class="flex-grow">
    <Button
      icon={IconEdit}
      label={tracker.string.NewIssue}
      width={'100%'}
      size={'small'}
      on:click={(evt) => newIssue(evt.currentTarget)}
    />
  </div>
  <div class="ml-2">
    <ActionIcon icon={IconSearch} label={ui.string.Search} action={async () => {}} size={'large'} />
  </div>
</div>
