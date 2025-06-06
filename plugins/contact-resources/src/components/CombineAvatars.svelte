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
  import { Person as Contact } from '@hcengineering/contact'
  import type { Class, Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { IconSize } from '@hcengineering/ui'
  import Avatar from './Avatar.svelte'
  import EmptyAvatar from './icons/EmptyAvatar.svelte'

  export let _class: Ref<Class<Contact>>
  export let items: (Ref<Contact> | undefined | null)[] | undefined = []
  export let size: IconSize
  export let limit: number = 3
  export let hideLimit: boolean = false

  let persons: Contact[] = []

  $: includeEmpty = items?.includes(undefined) || items?.includes(null)

  const query = createQuery()
  $: query.query<Contact>(
    _class,
    { _id: { $in: (items?.filter((p) => p) as Ref<Contact>[]) ?? [] } },
    (result) => {
      persons = result
    },
    { limit: includeEmpty ? limit - 1 : limit }
  )

  function getDataOver (last: boolean, items: (Ref<Contact> | undefined | null)[]): string | undefined {
    if (hideLimit) return
    if (items.length > limit && last) {
      return `+${items.length - limit + 1}`
    }
  }
</script>

{#if items !== undefined}
  <div class="hulyCombineAvatars-container">
    {#if includeEmpty}
      <div class="hulyCombineAvatar {size}" data-over={getDataOver(persons.length === 0, items)}>
        <EmptyAvatar {size} />
      </div>
    {/if}
    {#each persons as person, i}
      <div class="hulyCombineAvatar {size}" data-over={getDataOver(persons.length === i + 1, items)}>
        <Avatar {person} {size} name={person.name} showStatus={false} />
      </div>
    {/each}
  </div>
{/if}
