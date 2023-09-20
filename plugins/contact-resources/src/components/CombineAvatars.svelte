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
  export let items: (Ref<Contact> | undefined | null)[] = []
  export let size: IconSize
  export let limit: number = 3
  export let hideLimit: boolean = false

  let persons: Contact[] = []

  $: includeEmpty = items.includes(undefined) || items.includes(null)

  const query = createQuery()
  $: query.query<Contact>(
    _class,
    { _id: { $in: items.filter((p) => p) as Ref<Contact>[] } },
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

<div class="avatars-container">
  {#if includeEmpty}
    <div class="combine-avatar {size}" data-over={getDataOver(persons.length === 0, items)}>
      <EmptyAvatar {size} />
    </div>
  {/if}
  {#each persons as person, i}
    <div class="combine-avatar {size}" data-over={getDataOver(persons.length === i + 1, items)}>
      <Avatar avatar={person.avatar} {size} name={person.name} />
    </div>
  {/each}
</div>

<style lang="scss">
  .avatars-container {
    display: flex;
    align-items: center;

    .combine-avatar.inline:not(:first-child) {
      margin-left: calc(1px - (0.875rem / 2));
    }
    .combine-avatar.tiny:not(:first-child) {
      margin-left: calc(1px - (1.13rem / 2));
    }
    .combine-avatar.card:not(:first-child) {
      margin-left: calc(1px - (1.25rem / 2));
    }
    .combine-avatar.x-small:not(:first-child) {
      margin-left: calc(1px - (1.5rem / 2));
    }
    .combine-avatar.smaller:not(:first-child) {
      margin-left: calc(1px - (1.75rem / 2));
    }
    .combine-avatar.small:not(:first-child) {
      margin-left: calc(1px - 1rem);
    }
    .combine-avatar.medium:not(:first-child) {
      margin-left: calc(1px - (2.25rem / 2));
    }
    .combine-avatar.large:not(:first-child) {
      margin-left: calc(1px - (4.5rem / 2));
    }
    .combine-avatar.x-large:not(:first-child) {
      margin-left: calc(1px - (7.5rem / 2));
    }
    .combine-avatar:not(:last-child) {
      mask: radial-gradient(circle at 100% 50%, rgba(0, 0, 0, 0) 48.5%, rgb(0, 0, 0) 50%);
    }
    .combine-avatar.inline,
    .combine-avatar.tiny,
    .combine-avatar.card,
    .combine-avatar.x-small {
      font-size: 0.625rem;
    }
    .combine-avatar[data-over^='+']:last-child {
      position: relative;
      &::after {
        content: attr(data-over);
        position: absolute;
        top: 50%;
        left: 50%;
        color: var(--theme-caption-color);
        transform: translate(-53%, -52%);
        z-index: 2;
      }
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: var(--theme-bg-color);
        border: 1px solid var(--theme-divider-color);
        border-radius: 50%;
        opacity: 0.9;
        z-index: 1;
      }
    }
  }
</style>
