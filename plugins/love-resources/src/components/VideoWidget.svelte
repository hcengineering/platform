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
  import { Room as TypeRoom } from '@hcengineering/love'
  import { Ref } from '@hcengineering/core'
  import { closeWidget, WidgetState } from '@hcengineering/workbench-resources'

  import love from '../plugin'
  import VideoPopup from './VideoPopup.svelte'

  export let widgetState: WidgetState | undefined

  let room: Ref<TypeRoom> | undefined = undefined
  $: room = widgetState?.data?.room

  $: if (widgetState?.data?.room === undefined) {
    closeWidget(love.ids.VideoWidget)
  }
</script>

{#if room}
  <div class="root">
    <VideoPopup {room} isDock canUnpin={false} />
  </div>
{/if}

<style lang="scss">
  .root {
    display: flex;
    flex-direction: column;
    flex: 1;
    align-items: center;
    background-color: var(--theme-statusbar-color);
    overflow: hidden;
  }
</style>
