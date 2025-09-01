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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import type { AnySvelteComponent } from '@hcengineering/ui'
  import { AppItem } from '@hcengineering/workbench-resources'
  import { RoomType } from '@hcengineering/love'
  import { currentRoom } from '../../../stores'
  import { isSharingEnabled } from '../../../utils'
  import { state } from '@hcengineering/media-resources'
  import love from '../../../plugin'
  import { lkSessionConnected } from '../../../liveKitClient'

  export let label: IntlString
  export let icon: Asset | AnySvelteComponent
  export let selected: boolean = false
  export let size: 'small' | 'medium' | 'large' = 'small'

  $: allowCam = $currentRoom?.type === RoomType.Video
  $: isMicEnabled = $state.microphone?.enabled === true
  $: isCamEnabled = $state.camera?.enabled === true
</script>

<AppItem
  {label}
  icon={$isSharingEnabled
    ? love.icon.SharingDisabled
    : $lkSessionConnected && allowCam && !isCamEnabled && !isMicEnabled
      ? love.icon.CamDisabled
      : $lkSessionConnected && !allowCam && isMicEnabled
        ? love.icon.Mic
        : !allowCam || (!isCamEnabled && isMicEnabled)
            ? love.icon.Mic
            : icon}
  {selected}
  {size}
  kind={$isSharingEnabled
    ? 'negative'
    : $lkSessionConnected && isCamEnabled
      ? 'positive'
      : $lkSessionConnected && isMicEnabled
        ? 'warning'
        : $lkSessionConnected && !(isCamEnabled && isMicEnabled)
          ? 'accented'
          : 'default'}
  on:click
/>
