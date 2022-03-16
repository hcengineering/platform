<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import contact, { Person } from '@anticrm/contact'
  import type { Class, Doc, Ref } from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import { ActionIcon, CircleButton, IconAdd, IconClose, Label, ShowMore, showPopup } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import { UserInfo } from '..'
  import { createQuery } from '../utils'
  import UsersPopup from './UsersPopup.svelte'

  export let items: Ref<Person>[] = []
  export let _class: Ref<Class<Doc>>
  export let title: IntlString
  export let noItems: IntlString

  let persons: Person[] = []

  const query = createQuery()

  $: query.query<Person>(_class, { _id: { $in: items } }, (result) => {
    persons = result
  })

  const dispatch = createEventDispatcher()

  async function addRef (person: Person): Promise<void> {
    dispatch('open', person)
  }
  async function addPerson (evt: Event): Promise<void> {
    showPopup(
      UsersPopup,
      {
        _class,
        title,
        allowDeselect: false,
        ignoreUsers: items
      },
      evt.target as HTMLElement,
      (result) => {
        // We have some value selected
        if (result !== undefined) {
          addRef(result)
        }
      }
    )
  }

  async function removePerson (person: Person): Promise<void> {
    dispatch('delete', person)
  }
</script>

<div class="flex-row">
  <ShowMore>
    <div class="persons-container">
      <div class="flex flex-reverse">
        <div class="ml-4">
          <CircleButton icon={IconAdd} size={'small'} selected on:click={addPerson} />
        </div>
        <div class="person-items">
          {#if items?.length === 0}
            <div class="flex flex-grow title-center">
              <Label label={noItems} />
            </div>
          {/if}
          {#each persons as person}
            <div class="antiComponentBox flex-center margin_025 antiComponentBoxFocused">
              <UserInfo value={person} size={'medium'} />
              <div class="ml-1">
                <ActionIcon icon={IconClose} size={'small'} action={() => removePerson(person)} />
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </ShowMore>
</div>

<style lang="scss">
  .persons-container {
    padding: 0.5rem;
    color: var(--theme-caption-color);
    background: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: 0.75rem;
  }
  .person-items {
    flex-grow: 1;
    display: flex;
    flex-wrap: wrap;  
  }
  .margin_025 {
    margin: 0.25rem;
  }
</style>
