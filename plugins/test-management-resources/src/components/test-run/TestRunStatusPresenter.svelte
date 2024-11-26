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
  import { TestResult, TestRunStatus } from '@hcengineering/test-management'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import StatusEditor from '../test-result/TestResultStatusEditor.svelte'

  export let value: TestRunStatus
  export let object: TestResult
  export let onChange: ((value: TestRunStatus) => void) | undefined = undefined
  export let kind: ButtonKind = 'link'
  export let size: ButtonSize = 'large'
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = '100%'
  export let shouldShowAvatar: boolean = true
  export let accent: boolean = false

  $: disabled = onChange === undefined
</script>

<StatusEditor
  {value}
  {object}
  {kind}
  {size}
  {width}
  {justify}
  {disabled}
  {accent}
  {shouldShowAvatar}
  on:change={({ detail }) => onChange?.(detail)}
/>
