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
  import { Doc, DocumentQuery, Ref, Space, mergeQueries } from '@hcengineering/core'
  import { Button } from '@hcengineering/ui'
  import { selectionStore } from '@hcengineering/view-resources'
  import type { TestCase } from '@hcengineering/test-management'
  import { createQuery } from '@hcengineering/presentation'

  import testManagement from '../../plugin'
  import { showCreateTestRunPanel } from '../../utils'

  export let query: DocumentQuery<Doc> = {}
  export let space: Ref<Space>

  const docQuery = createQuery()
  let haveTestCases = false

  $: resultQuery = mergeQueries(query, { space })
  $: docQuery.query(
    testManagement.class.TestCase,
    resultQuery,
    (res) => {
      haveTestCases = res.length > 0
    },
    { limit: 1 }
  )

  const handleRun = async (): Promise<void> => {
    const selectedDocs = $selectionStore?.docs ?? []
    const testCases = selectedDocs.length > 0 ? selectedDocs : undefined
    await showCreateTestRunPanel({
      testCases: testCases as TestCase[]
    })
  }
</script>

<Button
  icon={testManagement.icon.Run}
  justify={'left'}
  kind={'primary'}
  label={testManagement.string.RunTestCases}
  disabled={!haveTestCases}
  on:click={handleRun}
/>
