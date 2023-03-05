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
  import type { Class, Doc, Ref } from '@hcengineering/core'
  import { createQuery } from '../utils'
  import { Person as Contact } from '@hcengineering/contact'
  import Avatar from './Avatar.svelte'
  import { IconSize } from '@hcengineering/ui'

  export let _class: Ref<Class<Doc>>
  export let items: Ref<Contact>[] = []
  export let size: IconSize
  export let limit: number = 3

  let persons: Contact[] = []
  const query = createQuery()
  $: query.query<Contact>(
    _class,
    { _id: { $in: items } },
    (result) => {
      persons = result
    },
    { limit }
  )
</script>

<div class="avatars-container">
  {#each persons as person}
    <div class="combine-avatar {size}">
      <Avatar avatar={person.avatar} {size} />
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
    .combine-avatar.x-small:not(:first-child) {
      margin-left: calc(1px - (1.5rem / 2));
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
  }
</style>
