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
  import testManagement from '@hcengineering/test-management'
  import { Doc, DocumentQuery, Ref, Space } from '@hcengineering/core'

  import TestResultModeSelector from './TestResultModeSelector.svelte'
  import TestRunButton from './TestRunButton.svelte'

  export let query: DocumentQuery<Doc> = {}
  export let space: Ref<Space>

  const modes: [string, IntlString, object][] = [
    [testManagement.mode.AllTests, testManagement.string.AllTests, {}],
    [testManagement.mode.MyTests, testManagement.string.MyTests, {}]
  ]
</script>

{#if modes !== undefined}
  <TestResultModeSelector {modes} />
  <TestRunButton {query} {space} />
{/if}
