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
    import { Button } from "@hcengineering/ui"
    import login from '@hcengineering/login'
    import { getResource } from "@hcengineering/platform"

    interface WorkspaceDomain {
        name: string
        txtRecord: string
        verifiedOn: number | null
    }

    export let workspaceDomain: WorkspaceDomain

    async function verifyDomain (domainName: string) {
        let verifyWorkspaceDomainFn = await getResource(login.function.VerifyWorkspaceDomain)
        const wsDomain = await verifyWorkspaceDomainFn(domainName)
        if(wsDomain?.verifiedOn != null) {
            workspaceDomain.verifiedOn = wsDomain.verifiedOn
        }
    }

</script>

<div>
    <span>{workspaceDomain.name}</span>
    <span>{workspaceDomain.txtRecord}</span>
    {#if !workspaceDomain.verifiedOn}
        <!-- Change login.string.GetLink to verify/refresh  -->
        <Button kind='primary' label={login.string.InviteLimit} on:click={() => verifyDomain(workspaceDomain.name)} />
    {/if}
</div>