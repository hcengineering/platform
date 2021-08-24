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
  export let vertical: boolean = false
  export let stretch: boolean = false
  export let bothScroll: boolean = false
  export let noShift: boolean = false
</script>

<div class="scroll" class:vertical class:bothScroll class:noShift>
  <div class="box" class:stretch>
    <slot/>
  </div>
</div>

<style lang="scss">
  .scroll {
    position: relative;
    width: auto;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    margin-right: 0;
    margin-bottom: -.75rem;

    .box {
      position: absolute;
      display: flex;
      padding: 0 0 .375rem 0;
      top: 0;
      left: 0;
      width: auto;
      height: 100%;
      &.stretch {
        width: 100%;
      }
    }

    &.vertical {
      margin: 0 -.5rem 0 -.5rem;
      overflow-x: hidden;
      overflow-y: auto;
      .box {
        flex-direction: column;
        padding: 0 .5rem 0 .5rem;
        width: 100%;
        height: auto;
        &.stretch {
          height: 100%;
        }
      }
    }

    &.bothScroll {
      margin: 0 -.375rem -.375rem 0;
      overflow: auto;
      .box {
        padding: 0 .375rem .375rem 0;
      }
    }

    &.noShift {
      margin: 0;
      .box { padding: 0; }
    }
  }
</style>
