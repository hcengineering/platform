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
  import { createQuery } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import { ToDo, WorkSlot } from '@hcengineering/time'
  import time from '../plugin'
  import ToDoPresenter from './ToDoPresenter.svelte'

  export let event: WorkSlot
  export let oneRow: boolean = false
  export let hideDetails: boolean = false

  let todo: ToDo

  const query = createQuery()
  $: query.query(event.attachedToClass, { _id: event.attachedTo }, (res) => {
    todo = res[0]
  })
</script>

{#if hideDetails}
  <Label label={time.string.WorkSlot} />
{:else if todo}
  <ToDoPresenter value={todo} withoutSpace={oneRow} />
{/if}
