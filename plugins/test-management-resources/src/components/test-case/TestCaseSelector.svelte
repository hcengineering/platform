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
  import { IntlString } from '@hcengineering/platform'
  import { Button, ButtonKind, ButtonShape, ButtonSize, Label } from '@hcengineering/ui'
  import { TestCase, TestProject } from '@hcengineering/test-management'

  import testManagement from '../../plugin'
  import { showSelectTestCasesPopup } from '../../utils'
  import { Ref } from '@hcengineering/core'

  export let objects: TestCase[]
  export let label: IntlString = testManagement.string.SelectedTestCases
  export let focusIndex = -1
  export let focus = false
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'large'
  export let justify: 'left' | 'center' = 'center'
  export let shape: ButtonShape = undefined
  export let width: string | undefined = undefined
  export let readonly = false
  export let space: Ref<TestProject> | undefined = undefined

  const onSave = (testCases: TestCase[]): void => {
    objects = testCases
  }

  const showSelectDialog = async (): Promise<void> => {
    if (!readonly) {
      await showSelectTestCasesPopup({ onSave, space })
    }
  }
</script>

<Button
  id="testcase.selector"
  {focus}
  {shape}
  {focusIndex}
  icon={testManagement.icon.TestCase}
  {size}
  {kind}
  {justify}
  {width}
  on:click={showSelectDialog}
>
  <span slot="content" class="overflow-label disabled text">
    <Label {label} params={{ count: objects?.length ?? 0 }} />
  </span>
</Button>
