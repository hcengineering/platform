<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->
<script lang="ts">
  import { onDestroy } from 'svelte'
  import { getName, getCurrentEmployee, Person } from '@hcengineering/contact'
  import { getPersonsByPersonRefs } from '@hcengineering/contact-resources'
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import { subscribeTyping, TypingInfo } from '@hcengineering/presence-resources'
  import { CardID } from '@hcengineering/communication-types'

  import communication from '../plugin'

  export let cardId: CardID
  const maxTypingPersons = 3
  const me = getCurrentEmployee()
  const hierarchy = getClient().getHierarchy()

  let typingInfo = new Map<string, Ref<Person>>()
  let typingPersonsLabel: string = ''
  let typingPersonsCount = 0
  let moreCount: number = 0

  $: void updateTypingPersons(typingInfo)

  async function updateTypingPersons (typingInfo: Map<string, Ref<Person>>): Promise<void> {
    const persons = await getPersonsByPersonRefs(Array.from(typingInfo.values()))
    const names = Array.from(persons.values())
      .map((person) => getName(hierarchy, person))
      .sort((name1, name2) => name1.localeCompare(name2))

    typingPersonsCount = names.length
    typingPersonsLabel = names.slice(0, maxTypingPersons).join(', ')
    moreCount = Math.max(names.length - maxTypingPersons, 0)
  }

  function handleTypingInfo (key: string, value: TypingInfo | undefined): void {
    if (value === undefined) {
      typingInfo.delete(key)
      typingInfo = typingInfo
      return
    }

    if (typingInfo.has(key) || value.personId === me) {
      return
    }

    typingInfo.set(key, value.personId)
    typingInfo = typingInfo
  }

  let unsubscribe: (() => Promise<boolean>) | undefined

  async function updateTypingSub (cardId: CardID): Promise<void> {
    await unsubscribe?.()
    typingInfo = new Map<string, Ref<Person>>()
    unsubscribe = await subscribeTyping(cardId, handleTypingInfo)
  }

  $: void updateTypingSub(cardId)

  onDestroy(() => {
    void unsubscribe?.()
  })
</script>

<span class="root h-4 mt-1 mb-1 ml-0-5 overflow-label">
  {#if typingPersonsLabel !== ''}
    <span class="fs-bold">
      {typingPersonsLabel}
    </span>
    {#if moreCount > 0}
      <span class="ml-1"><Label label={communication.string.AndMore} params={{ count: moreCount }} /></span>
    {/if}
    <span class="ml-1"><Label label={communication.string.IsTyping} params={{ count: typingPersonsCount }} /></span>
  {/if}
</span>

<style>
  .root {
    display: flex;
    align-items: center;
    font-size: 0.75rem;
  }
</style>
