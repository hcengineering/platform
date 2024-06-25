<script lang="ts">
  import login from '@hcengineering/login'
  import { getEmbeddedLabel, getMetadata } from '@hcengineering/platform'
  import presentation, { isAdminUser } from '@hcengineering/presentation'
  import { Button, IconArrowRight, fetchMetadataLocalStorage } from '@hcengineering/ui'
  import EditBox from '@hcengineering/ui/src/components/EditBox.svelte'

  const _endpoint: string = fetchMetadataLocalStorage(login.metadata.LoginEndpoint) ?? ''
  const token: string = getMetadata(presentation.metadata.Token) ?? ''

  let endpoint = _endpoint.replace(/^ws/g, 'http')
  if (endpoint.endsWith('/')) {
    endpoint = endpoint.substring(0, endpoint.length - 1)
  }
  let warningTimeout = 15
</script>

{#if isAdminUser()}
  <div class="flex flex-col">
    <div class="flex-row-center p-1">
      <div class="p-3">1.</div>
      <Button
        icon={IconArrowRight}
        label={getEmbeddedLabel('Set maintenance warning')}
        on:click={() => {
          void fetch(endpoint + `/api/v1/manage?token=${token}&operation=maintenance&timeout=${warningTimeout}`, {
            method: 'PUT'
          })
        }}
      />
      <div class="flex-col p-1">
        <div class="flex-row-center p-1">
          <EditBox kind={'underline'} format={'number'} bind:value={warningTimeout} /> min
        </div>
      </div>
    </div>

    <div class="flex-row-center p-1">
      <div class="p-3">2.</div>
      <Button
        icon={IconArrowRight}
        label={getEmbeddedLabel('Reboot server')}
        on:click={() => {
          void fetch(endpoint + `/api/v1/manage?token=${token}&operation=reboot`, {
            method: 'PUT'
          })
        }}
      />
    </div>
  </div>
{/if}

<style lang="scss">
  .greyed {
    color: rgba(black, 0.5);
  }
</style>
