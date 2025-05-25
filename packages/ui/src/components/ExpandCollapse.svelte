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
  import { afterUpdate, createEventDispatcher } from 'svelte'

  export let isExpanded = false

  const dispatch = createEventDispatcher()
  afterUpdate(() => dispatch('changeContent'))
</script>

<div class="expandcollapse-container" hidden={!isExpanded}>
  <div class="expandcollapse-content">
    <slot />
  </div>
</div>

<style lang="scss">
  .expandcollapse-container {
    min-height: 0;
    flex-shrink: 0;

    &::-webkit-scrollbar:vertical {
      width: 0;
    }
    &::-webkit-scrollbar:horizontal {
      height: 0;
    }

    .expandcollapse-content {
      flex-shrink: 0;
      min-width: 0;
      min-height: 0;
    }
  }
</style>
