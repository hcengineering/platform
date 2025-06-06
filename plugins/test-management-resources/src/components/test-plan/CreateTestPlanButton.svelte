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
  import { Button, IconAdd } from '@hcengineering/ui'

  import testManagement from '../../plugin'
  import { showCreateTestPlanPanel } from '../../utils'

  const handleRun = async (): Promise<void> => {
    await showCreateTestPlanPanel()
  }
</script>

<Button
  icon={IconAdd}
  justify={'left'}
  kind={'primary'}
  label={testManagement.string.CreateTestPlan}
  on:click={handleRun}
/>
