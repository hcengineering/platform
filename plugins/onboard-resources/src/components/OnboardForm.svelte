<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { LoginInfo, WorkspaceLoginInfo } from '@hcengineering/login'
  import { getAccount, getWorkspaces, navigateToWorkspace } from '@hcengineering/login-resources'
  import { OK } from '@hcengineering/platform'
  import { onMount } from 'svelte'
  import { Analytics } from '@hcengineering/analytics'

  import { OnboardSteps } from '../index'
  import onboard from '../plugin'
  import { ensureConfirmed, goToLogin } from '../utils'

  import Form from './Form.svelte'
  import OnboardUserForm from './OnboardUserForm.svelte'
  import OnboardWorkspaceForm from './OnboardWorkspaceForm.svelte'
  import { OnboardEvents } from '../analytics'

  const steps = Object.values(OnboardSteps)

  let account: LoginInfo | undefined = undefined

  let step: OnboardSteps = OnboardSteps.Workspace

  function handleStepEvent (event: CustomEvent<LoginInfo | WorkspaceLoginInfo | undefined>): void {
    if (event.detail != null) {
      account = event.detail
    }
    handleNext(step)
  }

  function handleNext (current: OnboardSteps): void {
    const next = steps.indexOf(current) + 1
    if (next < steps.length) {
      step = steps[next]
    }
  }

  function isWorkspaceLoginInfo (info: WorkspaceLoginInfo | LoginInfo): info is WorkspaceLoginInfo {
    return (info as WorkspaceLoginInfo).workspace !== undefined
  }

  onMount(async () => {
    account = await getAccount()
    if (account != null) {
      await ensureConfirmed(account)
    } else {
      goToLogin('login')
    }

    const workspaces = await getWorkspaces()
    if (workspaces.length > 0) {
      goToLogin('selectWorkspace')
    }
  })

  const action = {
    i18n: onboard.string.StartUsingHuly,
    func: async () => {
      if (account !== undefined && isWorkspaceLoginInfo(account)) {
        Analytics.handleEvent(OnboardEvents.StartHuly)
        navigateToWorkspace(account.workspace, account)
      }
    }
  }
</script>

{#if account}
  {#if step === OnboardSteps.Workspace}
    <OnboardWorkspaceForm {account} on:step={handleStepEvent} />
  {:else if step === OnboardSteps.User}
    <OnboardUserForm {account} on:step={handleStepEvent} />
  {:else if step === OnboardSteps.Finish}
    <Form
      status={OK}
      caption={onboard.string.SignUpCompleted}
      subtitle={account.email}
      fields={[]}
      object={{}}
      {action}
    />
  {/if}
{/if}
