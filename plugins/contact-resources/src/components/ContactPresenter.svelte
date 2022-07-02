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
  import { Contact, Employee, Organization } from '@anticrm/contact'
  import { getClient } from '@anticrm/presentation'
  import { Label } from '@anticrm/ui'
  import contact from '../plugin'

  import OrganizationPresenter from './OrganizationPresenter.svelte'
  import PersonPresenter from './PersonPresenter.svelte'

  export let value: Contact
  export let isInteractive = true

  function isPerson (value: Contact): boolean {
    const client = getClient()
    const hierarchy = client.getHierarchy()
    return hierarchy.isDerived(value._class, contact.class.Person)
  }
  function isEmployee (value: Contact): boolean {
    const client = getClient()
    const hierarchy = client.getHierarchy()
    return hierarchy.isDerived(value._class, contact.class.Employee)
  }
  const toOrg = (contact: Contact) => contact as Organization
  const toEmployee = (contact: Contact) => contact as Employee
</script>

{#if isPerson(value)}
  <PersonPresenter {isInteractive} {value} />
  {#if isEmployee(value) && toEmployee(value)?.active === false}
    <div class="ml-1">
      (<Label label={contact.string.Inactive} />)
    </div>
  {/if}
{:else}
  <OrganizationPresenter value={toOrg(value)} />
{/if}
