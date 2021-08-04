<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  export let value: number
  export let min: number = 0
  export let max: number = 100
  export let color: string = '#50BCF9'

  const proc: number = (max - min) / 100
  if (value > max) value = max
  if (value < min) value = min
</script>

<div class="progress-container">
  <div class="bar" style="background-color: {color}; width: calc(100% * {Math.round((value - min) / proc)} / 100);"/>
</div>

<style lang="scss">
  .progress-container {
    position: relative;
    width: 100%;
    height: 4px;
    background-color: var(--theme-button-bg-hovered);
    border-radius: 2px;

    .bar {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      border-radius: 2px;
    }
  }
</style>
