<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  export let percent: number = 0 // 0 to 1
  export let width: string = '1rem'
  export let height: string = '0.3125rem'

  $: clampedPercent = Math.min(Math.max(percent, 0), 1)

  // Calculate color based on current percentage
  $: fillColor = clampedPercent >= 0.9 ? '#e53935' : clampedPercent >= 0.7 ? '#fbc02d' : '#43a047'
</script>

<div class="progress-bar" style="width: {width}; height: {height};">
  <div class="progress-track">
    <div class="progress-fill" style="width: {clampedPercent * 100}%; background-color: {fillColor};"></div>
  </div>
</div>

<style lang="scss">
  .progress-bar {
    display: flex;
    align-items: center;
  }

  .progress-track {
    width: 100%;
    height: 100%;
    background-color: var(--button-secondary-BackgroundColor);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 2px;
    transition:
      width 0.3s ease,
      background-color 0.3s ease;
  }
</style>
