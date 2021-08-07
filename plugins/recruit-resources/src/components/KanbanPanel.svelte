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
  import { Label, ScrollBox } from '@anticrm/ui'

  export let label: IntlString
  export let color: string
  export let counter: number
</script>

<div class="panel-container" on:dragover on:drop>
  <div class="header" style="background-color: {color}">
    <div class="title"><Label {label} /></div>
    <div class="counter">{counter}</div>
  </div>
  <div class="scroll">
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
    width: 320px;
    height: 100%;
    background-color: var(--theme-button-bg-enabled);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: 12px;

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 12px;
      padding: 8px;
      min-height: 44px;
      font-weight: 500;
      border: 1px solid rgba(0, 0, 0, .1);
      border-radius: 8px;

      .title {
        padding-left: 8px;
        color: var(--theme-caption-color);
      }
      .counter {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 28px;
        height: 28px;
        color: var(--theme-contnet-accent-color);
        background-color: rgba(0, 0, 0, .08);
        border-radius: 50%;
      }
    }

    .scroll {
      margin: 8px 12px 12px;
      height: 100%;
    }
  }
</style>
