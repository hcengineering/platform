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
  import contact, { Person, SocialIdentity } from '@hcengineering/contact'
  import core, { FindResult, getObjectValue, includesAny, PersonId, Ref, Space, WithLookup } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import ui, {
    deviceOptionsStore,
    EditWithIcon,
    Icon,
    IconCheck,
    IconSearch,
    Loading,
    resizeObserver
  } from '@hcengineering/ui'
  import view, { Filter } from '@hcengineering/view'
  import { FILTER_DEBOUNCE_MS, sortFilterValues } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'

  import PersonPresenter from './PersonPresenter.svelte'

  export let filter: Filter
  export let space: Ref<Space> | undefined = undefined
  export let onChange: (e: Filter) => void

  const client = getClient()
  filter.modes = filter.modes === undefined ? [view.filter.FilterObjectIn, view.filter.FilterObjectNin] : filter.modes
  filter.mode = filter.mode === undefined ? filter.modes[0] : filter.mode

  let socialIdentities: (WithLookup<SocialIdentity> | undefined | null)[] = []
  let socialIdentitiesPromise: Promise<FindResult<SocialIdentity>> | undefined
  let personIdToPersonMap: Record<PersonId, Ref<Person>> = {}
  let personToPersonIdsMap: Record<Ref<Person>, PersonId[]> = {}
  let persons: Ref<Person>[] = []
  const targets = new Set<any>()

  let filterUpdateTimeout: any | undefined
  let search: string = ''

  const dispatch = createEventDispatcher()

  async function getValues (search: string): Promise<void> {
    if (socialIdentitiesPromise !== undefined) {
      await socialIdentitiesPromise
    }
    targets.clear()

    const spaces = (
      await client.findAll(core.class.Space, { archived: true }, { projection: { _id: 1, archived: 1, _class: 1 } })
    ).map((it) => it._id)

    const baseObjects = await client.findAll(
      filter.key._class,
      space !== undefined ? { space } : { space: { $nin: spaces } },
      {
        projection: { [filter.key.key]: 1, space: 1 }
      }
    )
    for (const object of baseObjects) {
      const socialIdentity = getObjectValue(filter.key.key, object) ?? undefined
      targets.add(socialIdentity)
    }
    for (const object of filter.value) {
      targets.add(object)
    }

    const resultQuery =
      search !== ''
        ? {
            '$lookup.attachedTo.name': { $like: '%' + search + '%' },
            _id: { $in: Array.from(targets.keys()) }
          }
        : {
            _id: { $in: Array.from(targets.keys()) }
          }
    socialIdentitiesPromise = client.findAll(contact.class.SocialIdentity, resultQuery, {
      lookup: { attachedTo: contact.class.Person }
    })
    socialIdentities = await socialIdentitiesPromise
    if (targets.has(undefined)) {
      socialIdentities.unshift(undefined)
    }

    personIdToPersonMap = (socialIdentities ?? []).reduce<Record<string, Ref<Person>>>((acc, sid) => {
      if (sid == null) return acc

      const person = sid?.$lookup?.attachedTo

      if (person == null) return acc

      acc[sid._id] = person._id

      return acc
    }, {})
    personToPersonIdsMap = (socialIdentities ?? []).reduce<Record<Ref<Person>, PersonId[]>>((acc, sid) => {
      if (sid == null) return acc

      const person = sid?.$lookup?.attachedTo

      if (person == null) return acc

      if (acc[person._id] == null) {
        acc[person._id] = []
      }

      acc[person._id].push(sid._id)

      return acc
    }, {})
    persons = sortFilterValues(Array.from(new Set(Object.values(personIdToPersonMap))), (p) =>
      isPersonSelected(p, filter.value)
    )

    socialIdentitiesPromise = undefined
  }

  function isPersonSelected (person: Ref<Person>, selectedIds: any[]): boolean {
    const personSocialIds = personToPersonIdsMap[person] ?? []

    return includesAny(personSocialIds, selectedIds)
  }

  function handleFilterToggle (person: Ref<Person>): void {
    const personSocialIds = personToPersonIdsMap[person] ?? []
    if (isPersonSelected(person, filter.value)) {
      filter.value = filter.value.filter((p) => !personSocialIds.includes(p))
    } else {
      filter.value = [...filter.value, ...personSocialIds]
    }

    updateFilter()
  }

  function updateFilter (): void {
    clearTimeout(filterUpdateTimeout)

    filterUpdateTimeout = setTimeout(() => {
      onChange(filter)
    }, FILTER_DEBOUNCE_MS)
  }

  $: {
    void getValues(search)
  }
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="header">
    <EditWithIcon
      icon={IconSearch}
      size={'large'}
      width={'100%'}
      autoFocus={!$deviceOptionsStore.isMobile}
      bind:value={search}
      placeholder={presentation.string.Search}
    />
  </div>
  <div class="scroll">
    <div class="box">
      {#if socialIdentitiesPromise}
        <Loading />
      {:else}
        {#each persons as person}
          <button
            class="menu-item no-focus flex-row-center"
            on:click={() => {
              handleFilterToggle(person)
            }}
          >
            <div class="clear-mins flex-grow">
              <PersonPresenter
                value={person}
                shouldShowPlaceholder
                defaultName={ui.string.NotSelected}
                disabled
                noUnderline
              />
            </div>
            <div class="check pointer-events-none">
              {#if isPersonSelected(person, filter.value)}
                <Icon icon={IconCheck} size={'small'} />
              {/if}
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>
  <div class="menu-space" />
</div>
