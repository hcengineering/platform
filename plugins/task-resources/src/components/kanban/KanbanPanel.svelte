<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import type { IntlString } from '@anticrm/platform'
  import { Label, ScrollBox, IconAdd } from '@anticrm/ui'

  export let label: IntlString
  export let color: string
  // export let counter: number
  export let addAction: () => void | undefined
</script>

<div class="panel-container step-lr75">
  <div class="header">
    <div class="bar" style="background-color: {color}" />
    <div class="flex-between label">
      <div>
        <Label {label} />
        <!-- <span>({counter})</span> -->
      </div>
      <div class="tool" on:click|preventDefault={addAction}>
        <IconAdd size={'small'} />
      </div>
    </div>
  </div>
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
    background-color: var(--theme-bg-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: .75rem;

    .header {
      display: flex;
      flex-direction: column;
      margin: 0 .75rem;
      height: 4rem;
      min-height: 4rem;
      user-select: none;

      .bar {
        height: .375rem;
        border-radius: 1px;
      }
      .label {
        padding: 0 .5rem 0 1rem;
        height: 100%;
        font-weight: 500;
        color: var(--theme-caption-color);
        // span {
        //   font-weight: 400;
        //   color: var(--theme-content-dark-color);
        // }
      }
      .tool {
        opacity: .4;
        cursor: pointer;
        &:hover { opacity: 1; }
      }
    }

    .scroll {
      margin: 0 .75rem .75rem;
      min-height: 0;
      height: 100%;
    }
  }
</style>
