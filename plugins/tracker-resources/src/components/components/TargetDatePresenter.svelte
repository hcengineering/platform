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
  import { Component } from '@hcengineering/tracker'
  import { getClient } from '@hcengineering/presentation'
  import { ButtonKind, DueDatePresenter } from '@hcengineering/ui'

  export let value: Component
  export let kind: ButtonKind = 'list'

  const client = getClient()

  $: dueDateMs = value.targetDate

  const handleDueDateChanged = async (newDate: number | null) => {
    await client.update(value, { targetDate: newDate })
  }
</script>

<DueDatePresenter value={dueDateMs} {kind} shouldRender onChange={handleDueDateChanged} />
