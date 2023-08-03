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
  import { Employee } from '@hcengineering/contact'
  import { DocumentQuery, Ref, RefTo } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import contact from '../plugin'
  import { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import EmployeeBox from './EmployeeBox.svelte'

  export let value: Ref<Employee> | undefined
  export let label: IntlString = contact.string.Employee
  export let onChange: (value: any) => void
  export let type: RefTo<Employee> | undefined
  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let readonly = false
  export let showNavigate = true

  $: _class = type?.to ?? contact.mixin.Employee

  const query: DocumentQuery<Employee> = {
    active: true
  }
</script>

<EmployeeBox
  {_class}
  docQuery={query}
  {label}
  {kind}
  {size}
  {justify}
  {width}
  {readonly}
  allowDeselect
  titleDeselect={contact.string.Cancel}
  bind:value
  on:change={(e) => onChange(e.detail)}
  {showNavigate}
/>
