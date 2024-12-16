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
  import { DocumentQuery, Ref, Space } from '@hcengineering/core'
  import { Button } from '@hcengineering/ui'
  import type { TestProject, TestResult } from '@hcengineering/test-management'
  import { selectionStore } from '@hcengineering/view-resources'

  import testManagement from '../../plugin'
  import { showTestRunnerPanel } from '../../utils'

  export let query: DocumentQuery<TestResult> = {}
  export let space: Ref<Space>

  const project: Ref<TestProject> = space as any

  const handleRun = async (): Promise<void> => {
    const selectedDocs = $selectionStore?.docs ?? []
    await showTestRunnerPanel({
      query,
      space: project,
      selectedDocs: selectedDocs.length > 0 ? (selectedDocs as TestResult[]) : undefined
    })
  }
</script>

<Button
  icon={testManagement.icon.Run}
  justify={'left'}
  kind={'primary'}
  label={testManagement.string.RunAssistant}
  on:click={handleRun}
/>
