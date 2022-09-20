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
  import type { Issue } from '@hcengineering/tracker'

  export let value: Issue | undefined

  export let maxWidth = ''
</script>

{#if value}
  <div class="root" style:max-width={maxWidth}>
    <span class="names">
      {#each value.parents as parentInfo}
        <span class="name">{parentInfo.parentTitle}</span>
      {/each}
    </span>
  </div>
{/if}

<style lang="scss">
  .root {
    display: flex;
    min-width: 0;

    .names {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: var(--content-color);
    }

    .name::before {
      content: '›';
      padding: 0 0.25rem;
    }
  }
</style>
