<script lang="ts">
  import { DropdownLabelsIntl, DropdownIntlItem, Label } from '@hcengineering/ui'
  import plugin from '../plugin'
  import { recorder } from '../stores/recorder'

  $: recordingCameraPosition = $recorder.recordingCameraPosition
  $: recordingCameraSize = $recorder.recordingCameraSize

  const sizes: DropdownIntlItem[] = [
    { label: plugin.string.Small, id: 'small' },
    { label: plugin.string.Medium, id: 'medium' },
    { label: plugin.string.Large, id: 'large' }
  ]

  const poses: DropdownIntlItem[] = [
    { label: plugin.string.TopLeft, id: 'top-left' },
    { label: plugin.string.TopRight, id: 'top-right' },
    { label: plugin.string.BottomLeft, id: 'bottom-left' },
    { label: plugin.string.BottomRight, id: 'bottom-right' }
  ]
</script>

<div class="antiPopup p-4 grid">
  <Label label={plugin.string.CameraSize} />
  <DropdownLabelsIntl
    items={sizes}
    justify={'left'}
    width={'100%'}
    selected={recordingCameraSize}
    on:selected={async (item) => {
      recorder.setRecordingCameraSize(item.detail)
    }}
  />

  <Label label={plugin.string.CameraPos} />
  <DropdownLabelsIntl
    items={poses}
    justify={'left'}
    width={'100%'}
    selected={recordingCameraPosition}
    on:selected={async (item) => {
      recorder.setRecordingCameraPosition(item.detail)
    }}
  />
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
