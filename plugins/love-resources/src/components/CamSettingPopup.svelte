<script lang="ts">
  import { translate } from '@hcengineering/platform'
  import { DropdownLabels, DropdownTextItem, Label, Progress, Toggle } from '@hcengineering/ui'
  import { Room } from 'livekit-client'
  import love from '../plugin'
  import { myPreferences } from '../stores'
  import { blurProcessor, getActive, lk, selectedCamId, updateBlurRadius } from '../utils'

  void Room.getLocalDevices().then(async (devices) => {
    devices.forEach((device) => {
      if (device.kind === 'videoinput') {
        cameras.push({ label: device.label, id: device.deviceId })
      }
    })
    if (cameras.length === 0) {
      cameras.push({ label: await translate(love.string.DefaultDevice, {}), id: 'default' })
    }
    cameras = cameras
  })

  let cameras: DropdownTextItem[] = []

  $: blurRadius = $myPreferences?.blurRadius ?? 0
  $: activeCamera = getActive(cameras, lk.getActiveDevice('videoinput'), localStorage.getItem(selectedCamId))
</script>

<div class="antiPopup p-4 grid">
  <Label label={love.string.Camera} />
  <DropdownLabels
    items={cameras}
    placeholder={love.string.Camera}
    enableSearch={false}
    justify={'left'}
    width={'100%'}
    disabled={cameras.length === 0}
    selected={activeCamera?.id}
    on:selected={async (item) => {
      if (item.detail != null && item.detail !== 'default') {
        await lk.switchActiveDevice('videoinput', item.detail)
        localStorage.setItem(selectedCamId, item.detail)
        activeCamera = cameras.find((p) => p.id === item.detail) ?? cameras[0]
      }
    }}
  />
  {#if blurProcessor !== undefined}
    <Label label={love.string.Blur} />
    <Toggle
      showTooltip={{ label: love.string.BlurTooltip }}
      on={blurRadius >= 0.5}
      on:change={(e) => {
        updateBlurRadius(e.detail ? 0.5 : 0)
      }}
    />
    {#if blurRadius >= 0.5}
      <Label label={love.string.BlurRadius} />
      <Progress
        editable
        max={10}
        min={0.5}
        value={blurRadius}
        on:change={(e) => {
          const value = Math.round(e.detail * 2) / 2
          updateBlurRadius(value)
        }}
      />
    {/if}
  {/if}
</div>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: 1fr auto;
    row-gap: 1rem;
    column-gap: 1rem;
    align-items: center;
  }
</style>
