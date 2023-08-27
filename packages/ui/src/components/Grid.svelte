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
  export let rowGap: number = 2.5
  export let columnGap: number = 1.5
  export let topGap: boolean = false
  export let equalHeight: boolean = false
  export let alignItems: 'start' | 'center' | 'end' | 'stretch' = 'center'

  $: style = `grid-template-columns: repeat(${column}, 1fr); row-gap: ${rowGap}rem; column-gap: ${columnGap}rem;${
    equalHeight ? ' grid-auto-rows: 1fr;' : ''
  }`
</script>

<div class="grid" {style} style:margin-top={topGap ? `${rowGap}rem` : 0} style:align-items={alignItems}>
  <slot />
</div>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    row-gap: 2.5rem;
    column-gap: 1.5rem;
  }
</style>
