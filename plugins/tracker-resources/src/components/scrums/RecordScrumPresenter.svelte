<!--
// Copyright © 2023 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { translate } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Scrum, ScrumRecord } from '@hcengineering/tracker'
  import { Button } from '@hcengineering/ui'
  import { handleRecordingScrum } from '../..'
  import tracker from '../../plugin'

  export let value: Scrum
  export let activeScrumRecord: ScrumRecord | undefined

  let title: string
  const client = getClient()
  $: isRecording = value._id === activeScrumRecord?.attachedTo
  $: translate(isRecording ? tracker.string.StopRecord : tracker.string.StartRecord, {}).then((res) => (title = res))
</script>

<Button
  kind="link"
  justify="center"
  {title}
  icon={isRecording ? tracker.icon.Stop : tracker.icon.Start}
  on:click={async () => handleRecordingScrum(client, value, activeScrumRecord)}
/>
