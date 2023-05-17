<!--
// Copyright © 2023 Anticrm Platform Contributors.
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
  import { CollaborationDiffViewer } from '@hcengineering/text-editor'
  import { ShowMore } from '@hcengineering/ui'

  export let value: string | undefined
  export let prevValue: string | undefined = undefined
  export let showOnlyDiff: boolean = false

  function removeSimilarLines (str1: string | undefined, str2: string | undefined) {
    str1 = str1 ?? ''
    str2 = str2 ?? ''
    const lines1 = str1.split('</p>')
    const lines2 = str2.split('</p>')
    let result1 = ''
    let result2 = ''
    for (let i = 0; i < Math.max(lines1.length, lines2.length); i++) {
      if (lines1[i] !== lines2[i]) {
        if (lines1[i]) result1 += lines1[i] + '</p>'
        if (lines2[i]) result2 += lines2[i] + '</p>'
      }
    }
    value = result1
    prevValue = result2
  }

  $: showOnlyDiff && removeSimilarLines(value, prevValue)
</script>

<ShowMore>
  {#key [value, prevValue]}
    <CollaborationDiffViewer content={value ?? ''} comparedVersion={prevValue ?? ''} noButton readonly />
  {/key}
</ShowMore>
