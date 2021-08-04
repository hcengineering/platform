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
  export let column: number = 2
  export let rowGap: number = 40
  export let columnGap: number = 24

  const style = `grid-template-columns: repeat(${column}, 1fr); row-gap: ${rowGap}px; column-gap: ${columnGap}px;`
</script>

<div class="grid" {style}>
  <slot />
</div>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    row-gap: 40px;
    column-gap: 24px;
  }
</style>
