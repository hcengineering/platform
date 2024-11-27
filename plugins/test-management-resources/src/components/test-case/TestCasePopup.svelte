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
  import type { Class, Ref } from '@hcengineering/core'
  import { DocPopup } from '@hcengineering/presentation'
  import { TestCase } from '@hcengineering/test-management'

  import TestCasePresenter from './TestCasePresenter.svelte'

  export let _class: Ref<Class<TestCase>>
  export let objects: TestCase[] = []
  export let allowDeselect = false
  export let closeAfterSelect: boolean = false
  export let shadows = true
  export let width: 'medium' | 'large' | 'full' = 'medium'
</script>

<DocPopup
  {_class}
  {objects}
  searchField={'name'}
  multiSelect={true}
  {allowDeselect}
  {closeAfterSelect}
  {shadows}
  {width}
  on:update
  on:close
  groupBy={'attachedTo'}
>
  <svelte:fragment slot="item" let:item={testCase}>
    <TestCasePresenter value={testCase} />
  </svelte:fragment>
</DocPopup>
