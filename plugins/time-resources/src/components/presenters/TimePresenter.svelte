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
  import { HOUR, Label, MINUTE } from '@hcengineering/ui'
  import time from '../../plugin'

  export let value: number
  $: days = Math.floor(value / HOUR / 24)
  $: hours = Math.floor(value / HOUR) % 24
  $: minutes = Math.floor((value % HOUR) / MINUTE)
</script>

<div class="flex-nowrap no-word-wrap">
  <Label label={time.string.TotalGroupTime} params={{ days, hours, minutes }} />
</div>
