<!--
//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import * as Diff from 'diff'

  export let value: string
  export let compareTo: string
  export let method: 'diffChars' | 'diffWords' | 'diffWordsWithSpace' = 'diffChars'

  const handleDiff = (oldValue: string, newValue: string): Diff.Change[] => Diff[method](oldValue, newValue)

  $: changes = handleDiff(compareTo, value)
</script>

{#each changes as change}
  <span
    class:text-editor-highlighted-node-add={change.added}
    class:text-editor-highlighted-node-delete={change.removed}
  >
    {change.value}
  </span>
{/each}
