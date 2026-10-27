<script lang="ts">
  import Card from '@hcengineering/presentation/src/components/Card.svelte'
  import Button from './Button.svelte'

  export let okAction: () => Promise<void> | void
</script>

<!-- The after-buttons contract used by CreateIssue; extensions and issue creation are outside this fixture. -->
<Card label={'Create'} {okAction} canSave on:close>
  <svelte:fragment slot="after-buttons" let:handleOkClick let:okProcessing let:canSave let:okLabel>
    <Button
      id="custom-save"
      loading={okProcessing}
      disabled={canSave !== true}
      label={okLabel}
      on:click={handleOkClick}
    />
  </svelte:fragment>
</Card>
