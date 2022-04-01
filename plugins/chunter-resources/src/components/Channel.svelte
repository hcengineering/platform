<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { Message } from '@anticrm/chunter'
  import contact,{ Employee } from '@anticrm/contact'
  import { Ref,Space } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import chunter from '../plugin'
  import MessageComponent from './Message.svelte'

  export let space: Ref<Space> | undefined

  let messages: Message[] | undefined
  let employees: Map<Ref<Employee>, Employee> = new Map<Ref<Employee>, Employee>()
  const query = createQuery()
  const employeeQuery = createQuery()

  employeeQuery.query(contact.class.Employee, { }, (res) => employees = new Map(res.map((r) => { return [r._id, r] })))

  $: updateQuery(space)

  function updateQuery (space: Ref<Space> | undefined) {
    if (space === undefined) {
      query.unsubscribe()
      messages = []
    }
    query.query(chunter.class.Message, {
      space
    }, (res) => {
      messages = res
    })
  }

</script>

<div class="flex-col container">
  {#if messages}
    {#each messages as message}
      <MessageComponent {message} {employees} on:openThread />
    {/each}
  {/if}
</div>

<style lang="scss">
  .container {
    flex-shrink: 0;
  }
</style>
