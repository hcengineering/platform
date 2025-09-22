<!--
// Copyright © 2024-2025 Anticrm Platform Contributors.
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
  import { type Class, type Doc, type Ref, notEmpty } from '@hcengineering/core'
  import { type Person, formatName, getCurrentEmployee } from '@hcengineering/contact'
  import { Avatar, getPersonsByPersonRefs } from '@hcengineering/contact-resources'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { IconSize, tooltip, deviceOptionsStore as deviceInfo, checkAdaptiveMatching } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'

  import PresenceList from './PresenceList.svelte'
  import { PresenceInfo, subscribePresence } from '../presence'
  import { followee, toggleFollowee } from '../store'

  export let object: Doc
  export let size: IconSize = 'small'
  export let limit: number = 4

  const me = getCurrentEmployee()

  let presenceInfo = new Map<string, Ref<Person>>()
  let persons: Person[] = []

  $: overLimit = persons.length > limit
  $: adaptive = checkAdaptiveMatching($deviceInfo.size, 'md') || overLimit

  let unsubscribe: (() => Promise<boolean>) | undefined

  async function updatePresence (presenceInfo: Map<string, Ref<Person>>): Promise<void> {
    const personByRef = await getPersonsByPersonRefs(Array.from(presenceInfo.values()))
    persons = presenceInfo
      .values()
      .map((p) => personByRef.get(p))
      .filter(notEmpty)
      .toArray()
  }

  function handlePresenceInfo (key: string, value: PresenceInfo | undefined): void {
    if (value === undefined) {
      presenceInfo.delete(key)
      presenceInfo = presenceInfo
      return
    }

    if (presenceInfo.has(key) || value.personId === me) {
      return
    }

    presenceInfo.set(key, value.personId)
    presenceInfo = presenceInfo
  }

  async function updatePresenceSub (objectClass: Ref<Class<Doc>>, objectId: Ref<Doc>): Promise<void> {
    await unsubscribe?.()
    presenceInfo = new Map<string, Ref<Person>>()
    unsubscribe = await subscribePresence(objectClass, objectId, handlePresenceInfo)
  }

  $: void updatePresenceSub(object._class, object._id)
  $: void updatePresence(presenceInfo)
  onDestroy(() => {
    void unsubscribe?.()
  })
</script>

{#if persons.length > 0}
  {#if adaptive}
    <div
      class="hulyCombineAvatars-container"
      use:tooltip={{ component: PresenceList, props: { persons, size }, direction: 'bottom' }}
    >
      {#each persons.slice(0, limit) as person, i}
        <div
          class="hulyCombineAvatar tiny"
          data-over={i === limit - 1 && overLimit ? `+${persons.length - limit + 1}` : undefined}
        >
          <Avatar name={person.name} {size} {person} />
        </div>
      {/each}
    </div>
  {:else}
    <div class="flex-row-center flex-gap-1">
      {#each persons as person}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          use:tooltip={{ label: getEmbeddedLabel(formatName(person.name)) }}
          class="avatar-button"
          class:followee-avatar={$followee === person._id}
          on:click={() => {
            toggleFollowee(person._id)
          }}
        >
          <Avatar name={person.name} {size} {person} />
        </div>
      {/each}
    </div>
  {/if}
{/if}

<style lang="scss">
  .avatar-button {
    cursor: pointer;
  }

  .followee-avatar {
    border-radius: 20%;
    outline: 2px solid var(--primary-button-default);
    outline-offset: 1px;
  }
</style>
