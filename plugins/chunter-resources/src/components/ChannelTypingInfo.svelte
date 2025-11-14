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
  import chunter from '@hcengineering/chunter'
  import { type Doc, type PersonId, getCurrentAccount } from '@hcengineering/core'
  import { getName } from '@hcengineering/contact'
  import { getPersonsByPersonIds } from '@hcengineering/contact-resources'
  import { IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import { type TypingInfo, typing } from '@hcengineering/presence-resources'

  export let object: Doc

  const maxTypingPersons = 3
  const acc = getCurrentAccount()
  const hierarchy = getClient().getHierarchy()

  interface TypingGroup {
    status: IntlString
    names: string
    count: number
    moreCount: number
  }

  let typingInfo = new Map<string, TypingInfo>()
  let typingGroups: TypingGroup[] = []

  $: void updateTypingPersons(typingInfo)

  async function updateTypingPersons (typingInfo: Map<string, TypingInfo>): Promise<void> {
    if (typingInfo.size === 0) {
      typingGroups = []
      return
    }

    const groupedByStatus = new Map<IntlString, PersonId[]>()
    for (const info of typingInfo.values()) {
      const status = info.status ?? chunter.string.IsTyping
      const existing = groupedByStatus.get(status) ?? []
      existing.push(info.socialId)
      groupedByStatus.set(status, existing)
    }

    const groups: TypingGroup[] = []

    for (const [status, personIds] of groupedByStatus.entries()) {
      const persons = await getPersonsByPersonIds(personIds)
      const names = Array.from(persons.values())
        .map((person) => getName(hierarchy, person))
        .sort((name1, name2) => name1.localeCompare(name2))

      if (names.length > 0) {
        const displayNames = names.slice(0, maxTypingPersons).join(', ')
        const moreCount = Math.max(names.length - maxTypingPersons, 0)

        groups.push({
          status,
          names: displayNames,
          count: names.length,
          moreCount
        })
      }
    }

    groups.sort((a, b) => a.status.localeCompare(b.status))

    typingGroups = groups
  }

  function handleTyping (typing: Map<string, TypingInfo>): void {
    typingInfo = typing
  }
</script>

<span
  class="root h-4 mt-1 mb-1 ml-0-5 overflow-label"
  use:typing={{
    socialId: acc.primarySocialId,
    objectId: object._id,
    onTyping: handleTyping
  }}
>
  {#each typingGroups as group, index}
    <span class="fs-bold" class:ml-1={index > 0}>{group.names}</span>
    {#if group.moreCount > 0}
      <span class="ml-1"><Label label={chunter.string.AndMore} params={{ count: group.moreCount }} /></span>
    {/if}
    <span class="ml-1"><Label label={group.status} params={{ count: group.count }} /></span>
  {/each}
</span>

<style>
  .root {
    display: flex;
    align-items: center;
    font-size: 0.75rem;
  }
</style>
