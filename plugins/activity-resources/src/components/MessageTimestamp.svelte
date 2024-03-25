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
  import { tooltip } from '@hcengineering/ui'
  import { getDisplayTime, Timestamp } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'

  export let date: Timestamp

  $: fullDate = new Date(date).toLocaleString('default', {
    minute: '2-digit',
    hour: 'numeric',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
</script>

<span class="text-sm" use:tooltip={{ label: getEmbeddedLabel(fullDate) }}>
  {getDisplayTime(date)}
</span>
