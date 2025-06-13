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
  import { onMount } from 'svelte'
  import { getName, getCurrentEmployee } from '@hcengineering/contact'
  import { getPersonsByPersonRefs } from '@hcengineering/contact-resources'
  import { notEmpty } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import { presenceByObjectId } from '@hcengineering/presence-resources'
  import { CardID } from '@hcengineering/communication-types'

  import communication from '../plugin'
  import { type PresenceTyping } from '../types'

  export let cardId: CardID
  const typingDelay = 2000
  const maxTypingPersons = 3
  const me = getCurrentEmployee()
  const hierarchy = getClient().getHierarchy()

  let typingPersonsLabel: string = ''
  let typingPersonsCount = 0
  let moreCount: number = 0

  let typing: PresenceTyping[] = []
  $: presence = $presenceByObjectId.get(cardId as any) ?? []
  $: typing = presence.map((p) => p.presence.typing).filter(notEmpty)

  $: void updateTypingPersons(typing)

  async function updateTypingPersons (typingInfo: PresenceTyping[]): Promise<void> {
    const now = Date.now()
    const personIds = new Set(
      typingInfo.filter((info) => info.person !== me && now - info.lastTyping < typingDelay).map((info) => info.person)
    )
    const persons = await getPersonsByPersonRefs(Array.from(personIds))
    const names = Array.from(persons.values())
      .map((person) => getName(hierarchy, person))
      .sort((name1, name2) => name1.localeCompare(name2))

    typingPersonsCount = names.length
    typingPersonsLabel = names.slice(0, maxTypingPersons).join(', ')
    moreCount = Math.max(names.length - maxTypingPersons, 0)
  }

  onMount(() => {
    const interval = setInterval(() => {
      void updateTypingPersons(typing)
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
