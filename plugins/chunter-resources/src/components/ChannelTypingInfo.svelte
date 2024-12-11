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
  import { onMount } from 'svelte'
  import chunter, { TypingInfo } from '@hcengineering/chunter'
  import { getName, Person, getCurrentEmployee } from '@hcengineering/contact'
  import { personByIdStore } from '@hcengineering/contact-resources'
  import { IdMap } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'

  export let typingInfo: TypingInfo[] = []

  const typingDelay = 2000
  const maxTypingPersons = 3
  const me = getCurrentEmployee()
  const hierarchy = getClient().getHierarchy()

  let typingPersonsLabel: string = ''
  let typingPersonsCount = 0
  let moreCount: number = 0

  $: updateTypingPersons($personByIdStore, typingInfo)

  function updateTypingPersons (personById: IdMap<Person>, typingInfo: TypingInfo[]) {
    const now = Date.now()
    const personIds = new Set(
      typingInfo
        .filter((info) => info.person !== me && now - info.lastTyping < typingDelay)
        .map((info) => info.person)
    )
    const names = Array.from(personIds)
      .map((personId) => personById.get(personId))
      .filter((person): person is Person => person !== undefined)
      .map((person) => getName(hierarchy, person))
      .sort((name1, name2) => name1.localeCompare(name2))

    typingPersonsCount = names.length
    typingPersonsLabel = names.slice(0, maxTypingPersons).join(', ')
    moreCount = Math.max(names.length - maxTypingPersons, 0)
  }

  onMount(() => {
    const interval = setInterval(() => {
      updateTypingPersons($personByIdStore, typingInfo)
    }, typingDelay)
    return () => {
      clearInterval(interval)
    }
  })
</script>

<span class="root h-4 mt-1 mb-1 ml-0-5 overflow-label">
  {#if typingPersonsLabel !== ''}
    <span class="fs-bold">
      {typingPersonsLabel}
    </span>
    {#if moreCount > 0}
      <span class="ml-1"><Label label={chunter.string.AndMore} params={{ count: moreCount }} /></span>
    {/if}
    <span class="ml-1"><Label label={chunter.string.IsTyping} params={{ count: typingPersonsCount }} /></span>
  {/if}
</span>

<style>
  .root {
    display: flex;
    align-items: center;
    font-size: 0.75rem;
  }
</style>
