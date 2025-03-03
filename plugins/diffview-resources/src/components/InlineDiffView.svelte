<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { parseDiff } from '../parser'
  import FileDiffView from './FileDiffView.svelte'

  export let patch: string
  export let fileName: string
  export let expandable = false
  export let expanded = true
  export let onExpand: ((value: boolean) => void) | undefined

  $: prefix = `
diff --git a/${fileName} b/${fileName}
index 3aa8590..6b64999 100644
--- a/${fileName}
+++ b/${fileName}
`

  $: diffFiles = parseDiff(prefix + patch)
</script>

{#each diffFiles as diffFile}
  <FileDiffView
    file={diffFile}
    viewed={!expanded}
    mode={'unified'}
    showExpand={expandable}
    showViewed={false}
    showChanges={false}
    on:change
    on:expanded={(evt) => {
      onExpand?.(evt.detail)
    }}
  />
{/each}
