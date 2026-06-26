<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { Button, IconError, showPopup } from '@hcengineering/ui'
  import workbench from '../plugin'
  import ShutdownNoticePopup from './ShutdownNoticePopup.svelte'

  let wrapperEl: HTMLDivElement

  function handleClick (): void {
    showPopup(ShutdownNoticePopup, {}, wrapperEl)
  }
</script>

<!-- Always shown in the header: the hosted service is being wound down and users must migrate. -->
<div class="shutdown-notice-wrapper" bind:this={wrapperEl}>
  <Button
    kind={'warning'}
    size="small"
    icon={IconError}
    label={workbench.string.ShutdownWarningShort}
    justify="left"
    on:click={handleClick}
  />
</div>

<style lang="scss">
  .shutdown-notice-wrapper {
    display: flex;
    align-items: center;
    margin: 0 0.5rem;
  }
</style>
