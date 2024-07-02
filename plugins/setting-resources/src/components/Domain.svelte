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
    import { getResource } from "@hcengineering/platform"
    import { copyTextToClipboard } from "@hcengineering/presentation"
    import { Button, Label } from "@hcengineering/ui"
    import plugin from "../plugin"

    interface WorkspaceDomain {
        name: string
        txtRecord: string
        verifiedOn: number | null
    }

    const TYPE = "TXT";
    const HOST = "@";

    export let workspaceDomain: WorkspaceDomain

    let verifying = false

    async function verifyDomain (domainName: string) {
        verifying = true
        let verifyWorkspaceDomainFn = await getResource(login.function.VerifyWorkspaceDomain)
        const wsDomain = await verifyWorkspaceDomainFn(domainName)
        if(wsDomain?.verifiedOn != null) {
            workspaceDomain.verifiedOn = wsDomain.verifiedOn
        }
        verifying = false
    }

</script>

<details>
  <summary>
    <span>{workspaceDomain.name}</span>
    {#if !workspaceDomain.verifiedOn}
      <Button loading={verifying} kind='primary' label={plugin.string.Verify} on:click={() => verifyDomain(workspaceDomain.name)} />
    {/if}
    <span>▼</span>
  </summary>
  <div class="table">
    <div>
      <p>
        <Label label={plugin.string.Type} />
      </p>
      <p>{TYPE}</p>
    </div>
    <div>
      <p>
        <Label label={plugin.string.Name} />
      </p>
      <p>{HOST}</p>
    </div>
    <div>
      <p>
        <Label label={plugin.string.TXTValue} />
      </p>
      <p>
        <span>{workspaceDomain.txtRecord}</span>
        <Button label={plugin.string.Copy} size={'x-small'} on:click={() => copyTextToClipboard(workspaceDomain.txtRecord)} />
      </p>
    </div>
  </div>
</details>

<style lang="scss">
  details {
    width: 100%;
    margin-top: 0.5rem;
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.25rem;
    padding: 0.5rem;

    summary {
      cursor: pointer;
      font-weight: 500;
      font-size: 0.8125rem;
      color: var(--theme-dark-color);
      padding: 0.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;

      span:first-child {
        color: var(--theme-caption-color);
      }

      span:last-child {
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