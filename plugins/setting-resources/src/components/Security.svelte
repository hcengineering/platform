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
  import login from '@hcengineering/login'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import setting, { type SecuritySettings } from "@hcengineering/setting"
  import { Breadcrumb, Button, Header, Scroller, showPopup, ToggleWithLabel } from '@hcengineering/ui'
  import Label from '@hcengineering/ui/src/components/Label.svelte'
  import { onMount } from 'svelte'
  import Domain from './Domain.svelte'

  interface WorkspaceDomain {
    name: string,
    verifiedOn: number | null
    txtRecord: string
  }

  let query = createQuery()
  let client = getClient()
  let allowMembersToInvite = false
  let existingSecuritySettings: SecuritySettings[]
  let domains: WorkspaceDomain[] = []

  $: query.query(setting.class.Security, {}, (set) => {
    existingSecuritySettings = set
    if(existingSecuritySettings !== undefined && existingSecuritySettings.length > 0) {
      allowMembersToInvite = existingSecuritySettings[0].allowMembersToSendInvite
    }
  })

  async function getWorkspaceDomains_(): Promise<WorkspaceDomain[]> {
    let getWorkspaceDomainsFn = await getResource(login.function.GetWorkspaceDomains)
    return await getWorkspaceDomainsFn()
  }

  onMount(async () => {
    domains = await getWorkspaceDomains_()
  })

  const showCreateDialog = async () => {
    showPopup(login.component.AddDomain, { targetElement: null }, 'top')
  }


  async function setAllowMembersToInvite (): Promise<void> {
    let newSecuritySettings = {
      allowMembersToSendInvite: allowMembersToInvite
    }

    if(existingSecuritySettings.length === 0) {
      client.createDoc(setting.class.Security, setting.space.Setting, newSecuritySettings)
    } else {
      client.updateDoc(
        setting.class.Security,
        setting.space.Setting,
        existingSecuritySettings[0]._id,
        newSecuritySettings
      )
    }
  }

</script>

<div class="hulyComponent">
  <Header>
    <Breadcrumb icon={setting.icon.Security} label={setting.string.Security} size={'large'} isCurrent />
  </Header>
  <div class="hulyComponent-content__column content">
    <Scroller align={'start'} padding={'var(--spacing-3)'} bottomPadding={'var(--spacing-3)'}>
      <div class="hulyComponent-content">
        <div class="mb-1 text-normal font-medium caption-color">
          <Label label={setting.string.PermittedEmailDomains} />
        </div>
        <div class="mb-1 flex-col flex-gap-2 items-start">
          <Label label={setting.string.EmailDomainRegistrationMessage} />
          <Button label={setting.string.AddDomain} on:click={showCreateDialog} />
        </div>
        <div class="mb-1 flex-col flex-gap-2 items-start">
          {#if domains.length > 0}
          {#each domains as domain}
          <Domain
            workspaceDomain={{
              name: domain.name,
              txtRecord: domain.txtRecord,
              verifiedOn: domain.verifiedOn,
            }}
          />
          {/each}
          {/if}
        </div>
        <div class="mt-4 fit-content">
          <ToggleWithLabel
            label={setting.string.AllowMembersToInvite}
            bind:on={allowMembersToInvite}
            on:change={() => setAllowMembersToInvite()}
          />
        </div>
      </div>
    </Scroller>
  </div>
</div>

<style lang="scss">
  .fit-content {
    max-width: fit-content;
  }
</style>
