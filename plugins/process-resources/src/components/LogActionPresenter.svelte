<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import process, { ExecutionLogAction } from '@hcengineering/process'
  import { Icon } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  export let value: ExecutionLogAction
</script>

{#if value === ExecutionLogAction.Started}
  <Icon icon={process.icon.Start} size={'small'} />
{:else if value === ExecutionLogAction.Rollback}
  <Icon icon={view.icon.Undo} size={'small'} />
{/if}
