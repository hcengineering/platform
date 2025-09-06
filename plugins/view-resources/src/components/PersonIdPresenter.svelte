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
  import { PersonId, Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import contact, { getPersonRefByPersonIdCb, Person } from '@hcengineering/contact'
  import { IconSize } from '@hcengineering/ui'

  import ObjectPresenter from './ObjectPresenter.svelte'

  export let value: PersonId | undefined
  export let shouldShowName = true
  export let shouldShowAvatar = true
  export let noUnderline = false
  export let shrink: boolean = false
  export let avatarSize: IconSize = 'x-small'

  const client = getClient()
  let person: Ref<Person> | undefined
  $: if (value !== undefined) {
    getPersonRefByPersonIdCb(client, value, (p) => {
      person = p ?? undefined
    })
  } else {
    person = undefined
  }
</script>

{#if person}
  <ObjectPresenter
    objectId={person}
    _class={contact.class.Person}
    {shouldShowName}
    {shouldShowAvatar}
    {noUnderline}
    shrink={shrink ? 1 : 0}
    props={{ avatarSize }}
  />
{/if}
