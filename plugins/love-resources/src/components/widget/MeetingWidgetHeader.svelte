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
    IconScaleFull,
    ButtonIcon,
    showPopup,
    PopupResult
  } from '@hcengineering/ui'
  import { MeetingMinutes, Room, RoomType } from '@hcengineering/love'
  import { onDestroy } from 'svelte'

  import love from '../../plugin'
  import RoomModal from '../RoomModal.svelte'
  import { currentRoom } from '../../stores'
  import { screenSharing } from '../../utils'

  export let room: Room
  export let doc: MeetingMinutes | undefined = undefined

  let breadcrumbs: BreadcrumbItem[]
  let popup: PopupResult | undefined

  $: breadcrumbs = [
    {
      id: 'meeting',
      icon: love.icon.Cam,
      title: doc?.title ?? room.name
    }
  ]

  function maximize (): void {
    popup = showPopup(RoomModal, { room }, 'full-centered')
  }

  onDestroy(() => {
    popup?.close()
  })
</script>

<Header type={'type-aside'} adaptive={'disabled'} closeOnEscape={false} on:close>
  <Breadcrumbs items={breadcrumbs} currentOnly />
  <svelte:fragment slot="actions">
    {#if ($currentRoom !== undefined && $screenSharing) || $currentRoom?.type === RoomType.Video}
      <ButtonIcon icon={IconScaleFull} kind="tertiary" size="small" noPrint on:click={maximize} />
    {/if}
  </svelte:fragment>
</Header>
