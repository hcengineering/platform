<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import contact, { Employee, Person } from '@hcengineering/contact'
  import type { Class, DocumentQuery, FindOptions, Ref } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { ButtonKind, ButtonSize, IconSize, LabelAndProps } from '@hcengineering/ui'
  import UserBox from './UserBox.svelte'
  import IconPerson from './icons/Person.svelte'

  export let _class: Ref<Class<Employee>> = contact.mixin.Employee
  export let options: FindOptions<Employee> | undefined = undefined
  export let docQuery: DocumentQuery<Employee> | undefined = {
    active: true
  }
  export let label: IntlString
  export let placeholder: IntlString = presentation.string.Search
  export let value: Ref<Person> | null | undefined
  export let allowDeselect = false
  export let titleDeselect: IntlString | undefined = undefined
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let avatarSize: IconSize = 'card'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let focusIndex = -1
  export let showTooltip: LabelAndProps | undefined = undefined
  export let showNavigate = true
  export let readonly = false
</script>

<UserBox
  {_class}
  {options}
  {docQuery}
  {label}
  icon={IconPerson}
  {placeholder}
  bind:value
  {allowDeselect}
  {titleDeselect}
  {kind}
  {size}
  {avatarSize}
  {justify}
  {width}
  {focusIndex}
  {showTooltip}
  {showNavigate}
  {readonly}
  on:change
/>
