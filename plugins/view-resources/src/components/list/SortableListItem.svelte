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
  import Circles from '../icons/Circles.svelte'

  export let isDraggable = false
</script>

<div class="root flex background-button-bg-color border-radius-1">
  <div class="flex-center ml-2">
    <div class="flex-no-shrink circles-mark" class:isDraggable><Circles /></div>
  </div>

  <slot />
</div>

<style lang="scss">
  .root {
    &:hover {
      .circles-mark.isDraggable {
        cursor: grab;
        opacity: 0.4;
      }
    }
  }

  .circles-mark {
    position: relative;
    opacity: 0;
    width: 0.375rem;
    height: 1rem;
    transition: opacity 0.1s;

    &.isDraggable::before {
      position: absolute;
      content: '';
      inset: -0.5rem;
    }
  }
</style>
