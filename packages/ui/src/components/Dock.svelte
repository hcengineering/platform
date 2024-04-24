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
  import { dockStore, unpin } from '../popups'

  function _close (result: any): void {
    if ($dockStore?.onClose !== undefined) $dockStore.onClose(result)
    $dockStore?.close()
  }
</script>

{#if $dockStore !== undefined}
  <div class="dock">
    <svelte:component
      this={$dockStore.is}
      {...$dockStore.props}
      isDock
      on:close={(ev) => {
        _close(ev?.detail)
      }}
      on:dock={() => {
        if ($dockStore !== undefined) {
          unpin()
        }
      }}
    />
  </div>
{/if}

<style lang="scss">
  .dock {
    box-sizing: content-box;
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    background-color: transparent;
    transform-origin: center;
  }
</style>
