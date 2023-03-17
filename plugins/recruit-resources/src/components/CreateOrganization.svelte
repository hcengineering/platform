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
  import contact, { Organization } from '@hcengineering/contact'
  import { CreateOrganization } from '@hcengineering/contact-resources'
  import { Ref, TxOperations } from '@hcengineering/core'
  import recruit from '../plugin'

  let createOrg: CreateOrganization

  export function canClose (): boolean {
    return createOrg.canClose()
  }

  async function onCreate (org: Ref<Organization>, client: TxOperations): Promise<void> {
    await client.createMixin(org, contact.class.Organization, contact.space.Contacts, recruit.mixin.VacancyList, {
      vacancies: 0
    })
  }
</script>

<CreateOrganization bind:this={createOrg} {onCreate} on:close />
