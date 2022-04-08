<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { ScrollBox } from '@anticrm/ui'

  export let label: string
  export let color: string
  export let customHeader: boolean
</script>

<div class="panel-container step-lr75">
  {#if customHeader}
    <slot name="header" />
  {:else}
    <div class="header">
      <div class="bar" style="background-color: {color}" />
      <div class="flex-between label">
        <div>
          <span class="lines-limit-2">{label}</span>
        </div>
      </div>
    </div>
  {/if}
  <div class="scroll" on:dragover on:drop>
    <ScrollBox vertical>
      <slot />
    </ScrollBox>
  </div>
</div>

<style lang="scss">
  .panel-container {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 20rem;
    height: 100%;
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: 0.25rem;

    .header {
      display: flex;
      flex-direction: column;
      height: 4rem;
      min-height: 4rem;
      user-select: none;

      .bar {
        height: 0.375rem;
        border-radius: 0.25rem;
      }
      .label {
        padding: 0 0.5rem 0 1rem;
        height: 100%;
        font-weight: 500;
        color: var(--theme-caption-color);
      }
    }

    .scroll {      
      min-height: 0;
      height: 100%;
    }
  }
</style>
