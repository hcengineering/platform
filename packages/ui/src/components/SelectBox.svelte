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
  export let gap: number = 0.75
  export let vertical: boolean = false
  export let stretch: boolean = false
  export let bothScroll: boolean = false
</script>

<div class="scrollBox" class:vertical class:bothScroll>
  <div class="box" class:stretch style="gap: {gap}rem">
    <slot />
  </div>
</div>

<style lang="scss">
  .scrollBox {
    position: relative;
    width: auto;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    margin-right: 0;
    margin-bottom: -0.375rem;

    .box {
      position: absolute;
      display: grid;
      grid-auto-flow: column;
      padding: 0 0 0.375rem 0;
      gap: 1.5rem;
      top: 0;
      left: 0;
      width: auto;
      height: 100%;
      &.stretch {
        width: 100%;
      }
    }

    &.vertical {
      margin: 0 -0.75rem 0 -0.75rem;
      overflow-x: hidden;
      overflow-y: auto;
      .box {
        padding: 0 0.75rem 0 0.75rem;
        width: 100%;
        height: auto;
        grid-auto-flow: row;
        &.stretch {
          height: 100%;
        }
      }
    }

    &.bothScroll {
      margin: 0 -0.375rem -0.375rem 0;
      overflow: auto;
      .box {
        padding: 0 0.375rem 0.375rem 0;
      }
    }
  }
</style>
