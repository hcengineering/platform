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
  import { ScrumRecord } from '@hcengineering/tracker'
  import { showPanel } from '@hcengineering/ui'
  import tracker from '../../plugin'

  export let value: ScrumRecord

  function handleOpenPanel () {
    showPanel(tracker.component.ScrumRecordPanel, value._id, value._class, 'content')
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="flex-presenter flex-grow" on:click={handleOpenPanel}>
  <span title={value.label} class="scrumRecordLabel flex-grow">{value.label}</span>
</div>

<style lang="scss">
  .scrumRecordLabel {
    display: block;
    min-width: 0;
    text-align: left;
    color: var(--theme-caption-color);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>
