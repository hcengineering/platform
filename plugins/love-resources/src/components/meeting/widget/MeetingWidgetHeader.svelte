<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import {
    Breadcrumbs,
    Header,
    BreadcrumbItem,
    IconMaximize,
    ButtonIcon,
    showPopup,
    PopupResult
  } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'

  import RoomModal from '../../RoomModal.svelte'
  import MeetingOptionsButton from '../controls/MeetingOptionsButton.svelte'
  import RecordingButton from '../controls/RecordingButton.svelte'
  import TranscriptionButton from '../controls/TranscriptionButton.svelte'
  import RoomAccessButton from '../controls/RoomAccessButton.svelte'
  import { activeMeeting, currentMeetingRoom } from '../../../meetings'
  import { ActiveMeeting } from '../../../types'

  export let meeting: ActiveMeeting | undefined = undefined

  let breadcrumbs: BreadcrumbItem[]
  let popup: PopupResult | undefined

  $: breadcrumbs = [
    {
      id: 'meeting',
      title: meeting?.document.title
    }
  ]

  function maximize (): void {
    popup = showPopup(RoomModal, {}, 'full-centered')
  }

  onDestroy(() => {
    popup?.close()
  })
</script>

<Header type={'type-aside'} adaptive={'disabled'} closeOnEscape={false} on:close>
  <Breadcrumbs items={breadcrumbs} currentOnly />
  <svelte:fragment slot="actions">
    {#if $activeMeeting !== undefined}
      <RoomAccessButton room={$currentMeetingRoom} kind="tertiary" size="small" />
      <RecordingButton kind="tertiary" size="small" />
      <TranscriptionButton kind="tertiary" size="small" />
      <MeetingOptionsButton room={$currentMeetingRoom} kind="tertiary" size="small" />
      <ButtonIcon icon={IconMaximize} kind="tertiary" size="small" noPrint on:click={maximize} />
    {/if}
  </svelte:fragment>
</Header>
