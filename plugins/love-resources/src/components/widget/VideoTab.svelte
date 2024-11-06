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
  import { Room } from '@hcengineering/love'

  import VideoPopup from '../VideoPopup.svelte'

  export let room: Room
</script>

  <div class="root">
    <VideoPopup room={room._id} isDock canUnpin={false} />
  </div>

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
