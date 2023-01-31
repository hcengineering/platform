<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Project } from '@hcengineering/tracker'
  import { getClient } from '@hcengineering/presentation'
  import CommonTrackerDatePresenter from '../CommonTrackerDatePresenter.svelte'

  export let value: Project
  export let kind: 'transparent' | 'primary' | 'link' | 'link-bordered' | 'list' = 'primary'

  const client = getClient()

  $: dueDateMs = value.targetDate

  const handleDueDateChanged = async (newDate: number | null) => {
    await client.update(value, { targetDate: newDate })
  }
</script>

<CommonTrackerDatePresenter dateMs={dueDateMs} shouldRender={true} {kind} onDateChange={handleDueDateChanged} />
