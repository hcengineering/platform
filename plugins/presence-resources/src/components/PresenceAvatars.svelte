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
  import { type Doc } from '@hcengineering/core'
  import contact, { formatName } from '@hcengineering/contact'
  import { Avatar, CombineAvatars, personByIdStore } from '@hcengineering/contact-resources'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { IconSize, tooltip } from '@hcengineering/ui'
  import { presenceByObjectId } from '../store'

  export let object: Doc

  export let size: IconSize = 'small'
  export let limit: number = 5
  export let hideLimit: boolean = false
  export let combine = false

  $: presence = $presenceByObjectId?.get(object._id) ?? []
  $: items = presence.map((it) => it.person)
</script>

{#if items.length > 0}
  {#if combine}
    <CombineAvatars _class={contact.mixin.Employee} {items} {size} {limit} {hideLimit} />
  {:else}
    <div class="flex-row-center flex-gap-0-5">
      {#each items as item}
        {@const person = $personByIdStore.get(item)}
        {#if person}
          <div use:tooltip={{ label: getEmbeddedLabel(formatName(person.name)) }}>
            <Avatar name={person.name} {size} {person} />
          </div>
        {/if}
      {/each}
    </div>
  {/if}
{/if}
