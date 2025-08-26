<script lang="ts">
  import core, { getCurrentAccount } from '@hcengineering/core'
  import { DevicesPreference } from '@hcengineering/love'
  import { getClient } from '@hcengineering/presentation'
  import { Component, Label, Loading, Toggle } from '@hcengineering/ui'
  import { isKrispNoiseFilterSupported } from '@livekit/krisp-noise-filter'
  import love from '../../plugin'
  import { myPreferences } from '../../stores'
  import { krispProcessor } from '../../utils'
  import mediaPlugin, { getMediaDevices } from '@hcengineering/media'

  const client = getClient()

  async function saveNoiseCancellationPreference (
    myPreferences: DevicesPreference | undefined,
    value: boolean
  ): Promise<void> {
    if (myPreferences !== undefined) {
      await client.update(myPreferences, { noiseCancellation: value })
    } else {
      const acc = getCurrentAccount().uuid
      await client.createDoc(love.class.DevicesPreference, core.space.Workspace, {
        attachedTo: acc,
        noiseCancellation: value,
        camEnabled: true,
        micEnabled: true,
        blurRadius: 0
      })
    }
    await krispProcessor.setEnabled(value)
  }
</script>

<div class="antiPopup mediaPopup">
  {#await getMediaDevices(true, false)}
    <div class="p-4">
      <Loading />
    </div>
  {:then mediaInfo}
    <Component is={mediaPlugin.component.MediaPopupMicSelector} props={{ mediaInfo }} />
    <Component is={mediaPlugin.component.MediaPopupSpkSelector} props={{ mediaInfo }} />
    {#if isKrispNoiseFilterSupported()}
      <div class="grid p-3">
        <Label label={love.string.NoiseCancellation} />
        <Toggle
          on={$myPreferences?.noiseCancellation ?? true}
          on:change={(e) => {
            saveNoiseCancellationPreference($myPreferences, e.detail)
          }}
        />
      </div>
    {/if}
  {/await}
</div>

<style lang="scss">
  .mediaPopup {
    width: 20rem;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr auto;
    row-gap: 1rem;
    column-gap: 1rem;
    align-items: center;
  }
</style>
