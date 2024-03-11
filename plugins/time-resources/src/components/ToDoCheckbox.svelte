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
  import { ToDoPriority } from '@hcengineering/time'
  import { CheckBox } from '@hcengineering/ui'
  import { getToDoPriorityColor } from '../utils'

  export let checked: boolean = false
  export let priority: ToDoPriority = ToDoPriority.NoPriority

  $: color = checked ? undefined : getToDoPriorityColor(priority)
</script>

<CheckBox kind={'todo'} size={'medium'} {checked} {color} on:value />
