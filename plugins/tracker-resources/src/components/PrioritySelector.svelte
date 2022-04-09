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
  import { IssuePriority } from '@anticrm/tracker'
  import { Button, showPopup, SelectPopup } from '@anticrm/ui'
  import { issuePriorities } from '../utils'
  import tracker from '../plugin'

  export let priority: IssuePriority

  const prioritiesInfo = [
    IssuePriority.NoPriority,
    IssuePriority.Urgent,
    IssuePriority.High,
    IssuePriority.Medium,
    IssuePriority.Low
  ].map((s) => ({ id: s, ...issuePriorities[s] }))

  function handlePriorityChange (id: any) {
    if (id !== undefined) {
      priority = id
    }
  }
</script>

<Button
  label={issuePriorities[priority].label}
  icon={issuePriorities[priority].icon}
  width="min-content"
  size="small"
  kind="no-border"
  on:click={(ev) => {
    showPopup(
      SelectPopup,
      { value: prioritiesInfo, placeholder: tracker.string.SetStatus },
      ev.currentTarget,
      handlePriorityChange
    )
  }}
/>
