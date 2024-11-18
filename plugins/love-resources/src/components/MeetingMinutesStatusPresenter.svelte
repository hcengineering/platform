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
  import { MeetingMinutes, MeetingStatus } from '@hcengineering/love'
  import { StateType, StateTag } from '@hcengineering/ui'

  import love from '../plugin'

  export let object: MeetingMinutes | undefined
  export let value: MeetingStatus | undefined
  export let attributeKey: string | undefined

  const displayData = {
    [MeetingStatus.Active]: {
      label: love.string.Active,
      type: StateType.Positive
    },
    [MeetingStatus.Finished]: {
      label: love.string.Finished,
      type: StateType.Regular
    }
  }

  let status: MeetingStatus | undefined

  $: status = value ?? object?.status
  $: data = status !== undefined ? displayData[status] : undefined
</script>

{#if data}
  <span class="flex-row-center" class:ml-3={attributeKey !== undefined}>
    <StateTag type={data.type} label={data.label} />
  </span>
{/if}
