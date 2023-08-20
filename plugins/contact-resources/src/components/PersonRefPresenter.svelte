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
  import contact, { Person } from '@hcengineering/contact'
  import { Class, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { PersonLabelTooltip } from '..'
  import PersonPresenter from './PersonPresenter.svelte'

  export let value: Ref<Person> | null | undefined
  export let _class: Ref<Class<Person>> = contact.class.Person
  export let inline = false
  export let enlargedText = false
  export let disabled = false
  export let accent: boolean = false
  export let shouldShowAvatar = true
  export let shouldShowName = true
  export let shouldShowPlaceholder = true
  export let defaultName: IntlString | undefined = undefined
  export let tooltipLabels: PersonLabelTooltip | undefined = undefined
  export let avatarSize: 'inline' | 'tiny' | 'x-small' | 'small' | 'medium' | 'large' | 'x-large' = 'x-small'
  export let onEdit: ((event: MouseEvent) => void) | undefined = undefined

  let person: Person | undefined
  const query = createQuery()
  $: value && query.query(_class, { _id: value }, (res) => ([person] = res), { limit: 1 })

  function getValue (person: Person | undefined, value: Ref<Person> | null | undefined): Person | null | undefined {
    if (value === undefined || value === null) {
      return value
    }
    return person
  }
</script>

<PersonPresenter
  value={getValue(person, value)}
  {onEdit}
  {avatarSize}
  {tooltipLabels}
  {defaultName}
  {shouldShowAvatar}
  {shouldShowName}
  {shouldShowPlaceholder}
  {enlargedText}
  {disabled}
  {inline}
  {accent}
  on:accent-color
/>
