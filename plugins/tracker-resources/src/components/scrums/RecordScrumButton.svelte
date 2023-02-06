<script lang="ts">
  import { getClient } from '@hcengineering/presentation'
  import { Scrum, ScrumRecord } from '@hcengineering/tracker'
  import { Button, IconStart, IconStop } from '@hcengineering/ui'
  import { handleRecordingScrum } from '../..'
  import tracker from '../../plugin'

  export let scrum: Scrum
  export let activeScrumRecord: ScrumRecord | undefined

  const client = getClient()

  $: isRecording = scrum._id === activeScrumRecord?.attachedTo
</script>

<Button
  size="small"
  icon={isRecording ? IconStop : IconStart}
  label={isRecording ? tracker.string.StopRecord : tracker.string.StartRecord}
  kind={'primary'}
  on:click={() => handleRecordingScrum(client, scrum, activeScrumRecord)}
/>
