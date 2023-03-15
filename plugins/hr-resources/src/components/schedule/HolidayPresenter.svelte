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
  import { Staff } from '@hcengineering/hr'

  export let value: Staff
  export let month: Date
  export let display: (staff: Staff, month: Date) => number | string

  // $: _value = display(value)
</script>

{#await display(value, month) then _value}
  <span class="select-text flex lines-limit-2">{_value}</span>
{/await}
