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
  import { getName } from '@hcengineering/contact'
  import contact, { Avatar } from '@hcengineering/contact-resources'
  import hr, { Department, Staff } from '@hcengineering/hr'
  import { getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'

  export let value: Staff

  const client = getClient()

  async function getDepartment (staff: Staff): Promise<Department | undefined> {
    return await client.findOne(hr.class.Department, {
      _id: staff.department
    })
  }
</script>

{#if value}
  <DocNavLink object={value}>
    <div class="flex-row-center">
      <div class="member-icon mr-2">
        <Avatar size={'medium'} person={value} name={value.name} />
      </div>
      <div class="flex-col">
        <div class="member-title fs-title">
          {getName(client.getHierarchy(), value)}
          {#if !value.active}
            <span class="member-inactive"><Label label={contact.string.Inactive} /></span>
          {/if}
        </div>
        {#await getDepartment(value) then department}
          {#if department}
            <div class="member-department text-md">
              {department.name}
            </div>
          {/if}
        {/await}
      </div>
    </div>
  </DocNavLink>
{/if}

<style lang="scss">
  .member-icon {
    color: var(--theme-dark-color);
  }
  .member-title {
    color: var(--theme-caption-color);
    overflow: hidden;
  }
  .member-inactive {
    color: var(--theme-warning-color);
    opacity: 0.8;
    font-size: 0.75rem;
    margin-left: 0.25rem;
  }
  .member-department {
    color: var(--theme-caption-color);
    opacity: 0.6;
    overflow: hidden;
  }
</style>
