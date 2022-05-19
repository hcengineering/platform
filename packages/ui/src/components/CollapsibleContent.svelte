<!--
// Copyright © 2022 Anticrm Platform Contributors.
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
  import CollapseIcon from './icons/Collapse.svelte'
  import ExpandIcon from './icons/Expand.svelte'

  export let expanded: boolean = false

  const toggle = () => {
    expanded = !expanded
  }
</script>

<div>
  <div on:click={toggle}>
    {#if expanded}
      <ExpandIcon size="small" />
    {:else}
      <CollapseIcon size="small" />
    {/if}
    <slot name="header" />
  </div>
  {#if expanded}
    <slot name="content" />
  {/if}
</div>
