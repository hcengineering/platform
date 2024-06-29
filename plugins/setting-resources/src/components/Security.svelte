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
  import { copyTextToClipboard, createQuery, getClient } from '@hcengineering/presentation'
  import setting, { type SecuritySettings } from "@hcengineering/setting"
  import { Breadcrumb, Button, Header, Scroller, showPopup, ToggleWithLabel } from '@hcengineering/ui'
  import Label from '@hcengineering/ui/src/components/Label.svelte'

  let query = createQuery()
  let client = getClient()
  let allowMembersToInvite = false
  let existingSecuritySettings: SecuritySettings[]

  const TYPE = "TXT";
  const HOST = "@";

  // TODO: Replace with actual data
  let dummyData = [
    { 
      name: "d-one.design", 
      txtRecord: '1password-site-verification=HE47YLE6UVFZJLLDZUEHKO53DY',  
    },
  ]

  $: query.query(setting.class.Security, {}, (set) => {
    existingSecuritySettings = set
    if(existingSecuritySettings !== undefined && existingSecuritySettings.length > 0) {
      allowMembersToInvite = existingSecuritySettings[0].allowMembersToSendInvite
    }
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
          {#each  dummyData as item}
          <details>
            <summary>
              <span>{item.name}</span>
              <span>▼</span>
            </summary>
            <div class="table">
              <div>
                <p>
                  <Label label={setting.string.Type} />
                </p>
                <p>{TYPE}</p>
              </div>
              <div>
                <p>
                  <Label label={setting.string.Name} />
                </p>
                <p>{HOST}</p>
              </div>
              <div>
                <p>
                  <Label label={setting.string.Value} />
                </p>
                <p>
                  <span>{item.txtRecord}</span>
                  <Button label={setting.string.Copy} size={'x-small'} on:click={() => copyTextToClipboard(item.txtRecord)} />
                </p>
              </div>
            </div>
          </details>
          {/each}
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

  details {
    margin-top: 0.5rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.25rem;
    padding: 0.5rem;

    @media screen and (min-width: 768px) {
      min-width: 575px;
    }

    summary {
      cursor: pointer;
      font-weight: 500;
      font-size: 0.8125rem;
      color: var(--theme-dark-color);
      padding: 0.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;

      span:nth-child(1) {
        color: var(--theme-caption-color);
      }

      span:nth-child(2) {
        margin-left: auto;
      }
    }

    .table {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 0.5rem;
      padding-bottom: 0;

      & > div {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        
        p:nth-child(1) {
          font-weight: 500;
          font-size: 0.8125rem;
          color: var(--theme-dark-color);
          margin: 0;
          text-align: left;
        }

        p:nth-child(2) {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-height: 3rem;
          font-weight: 400;
          font-size: 0.8125rem;
          color: var(--theme-caption-color);
          margin: 0;
          text-align: left;
        }
      }
    }
  }
</style>
