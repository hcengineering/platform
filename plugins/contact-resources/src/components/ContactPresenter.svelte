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
  import { Contact, Employee, Organization } from '@hcengineering/contact'
  import { getClient } from '@hcengineering/presentation'
  import contact from '../plugin'
  import EmployeePresenter from './EmployeePresenter.svelte'

  import OrganizationPresenter from './OrganizationPresenter.svelte'
  import PersonPresenter from './PersonPresenter.svelte'
  import { IconSize } from '@hcengineering/ui'

  export let value: Contact
  export let inline: boolean = false
  export let disabled: boolean = false
  export let accent: boolean = false
  export let maxWidth = ''
  export let avatarSize: IconSize = 'x-small'

  function isPerson (value: Contact): boolean {
    const client = getClient()
    const hierarchy = client.getHierarchy()
    return hierarchy.isDerived(value._class, contact.class.Person)
  }
  function isEmployee (value: Contact): boolean {
    const client = getClient()
    const hierarchy = client.getHierarchy()
    return hierarchy.isDerived(value._class, contact.mixin.Employee)
  }
  const toOrg = (contact: Contact) => contact as Organization
  const toEmployee = (contact: Contact) => contact as Employee
</script>

{#if isEmployee(value)}
  <EmployeePresenter {disabled} value={toEmployee(value)} {inline} {accent} {avatarSize} />
{:else if isPerson(value)}
  <PersonPresenter {disabled} {value} {inline} {accent} {avatarSize} />
{:else}
  <OrganizationPresenter value={toOrg(value)} {inline} {accent} {maxWidth} />
{/if}
