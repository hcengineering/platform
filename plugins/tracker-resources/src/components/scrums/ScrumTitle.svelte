<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Scrum } from '@hcengineering/tracker'
  import { Icon } from '@hcengineering/ui'
  import tracker from '../../plugin'
  export let value: Scrum | undefined

  const getMinutes = (date: Date) => {
    const currentMinutes = date.getMinutes()
    return Math.floor(currentMinutes / 10) > 0 ? currentMinutes : `0${currentMinutes}`
  }
</script>

{#if value}
  {@const start = new Date(value.beginTime)}
  {@const end = new Date(value.endTime)}
  <span class="overflow-label flex-row-center flex-grow">
    <Icon icon={tracker.icon.Scrum} size={'small'} />
    <div class="ml-2 mr-2">
      {value.title}
    </div>
    <span class="flex flex-grow justify-end">
      {`${start.getHours()}:${getMinutes(start)}`}
      -
      {`${end.getHours()}:${getMinutes(end)}`}
    </span>
  </span>
{/if}
