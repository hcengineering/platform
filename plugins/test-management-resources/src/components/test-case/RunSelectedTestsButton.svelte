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
  import { Doc, DocumentQuery, Ref, Space } from '@hcengineering/core'
  import { ButtonWithDropdown, IconDropdown, SelectPopupValueType } from '@hcengineering/ui'
  import { selectionStore } from '@hcengineering/view-resources'
  import type { TestProject } from '@hcengineering/test-management'

  import testManagement from '../../plugin'
  import { showCreateTestRunPopup } from '../../utils'

  export let query: DocumentQuery<Doc> = {}
  export let space: Ref<Space>

  const project: Ref<TestProject> = space as any

  const commonDropdownItems = [
    {
      id: testManagement.string.RunAllTestCases,
      label: testManagement.string.RunAllTestCases,
      icon: testManagement.icon.TestRuns
    },
    {
      id: testManagement.string.RunFilteredTestCases,
      label: testManagement.string.RunFilteredTestCases,
      icon: testManagement.icon.Filter
    }
  ]

  let dropdownItems: SelectPopupValueType[] = []

  $: dropdownItems =
    $selectionStore?.docs?.length > 0
      ? [
          ...commonDropdownItems,
          {
            id: testManagement.string.RunSelectedTestCases,
            label: testManagement.string.RunSelectedTestCases,
            icon: testManagement.icon.Check
          }
        ]
      : commonDropdownItems

  async function handleDropdownItemSelected (res?: SelectPopupValueType['id']): Promise<void> {
    switch (res) {
      case testManagement.string.RunAllTestCases: {
        await showCreateTestRunPopup({ space: project })
        return
      }
      case testManagement.string.RunFilteredTestCases: {
        await showCreateTestRunPopup({ query, space: project })
        return
      }
      case testManagement.string.RunSelectedTestCases: {
        await showCreateTestRunPopup({ space: project, testCases: $selectionStore?.docs as any })
      }
    }
  }

  const handleRunAllTestCases = async (): Promise<void> => {
    await showCreateTestRunPopup({ space: project })
  }
</script>

<ButtonWithDropdown
  icon={testManagement.icon.TestRuns}
  justify={'left'}
  kind={'primary'}
  label={testManagement.string.RunAllTestCases}
  dropdownIcon={IconDropdown}
  {dropdownItems}
  on:click={handleRunAllTestCases}
  on:dropdown-selected={(ev) => {
    void handleDropdownItemSelected(ev.detail)
  }}
/>
