<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { MarkupMark } from '@hcengineering/text'
  import Mark from './Mark.svelte'

  export let marks: MarkupMark[]
</script>

{#if marks.length > 0}
  {@const mark = marks[0]}
  {@const others = marks.slice(1)}

  {#if others.length > 0}
    <Mark {mark}>
      <svelte:self marks={others}>
        <slot />
      </svelte:self>
    </Mark>
  {:else}
    <Mark {mark}>
      <slot />
    </Mark>
  {/if}
{:else}
  <slot />
{/if}
