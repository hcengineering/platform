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
  import { AccountRole, Ref, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Button, ButtonWithDropdown, IconAdd, IconDropdown, Loading, SelectPopupValueType } from '@hcengineering/ui'
  import { TestProject } from '@hcengineering/test-management'

  import { showCreateTestCasePopup, showCreateTestSuitePopup, showCreateProjectPopup } from '../utils'
  import { getTestSuiteIdFromLocation } from '../navigation'
  import testManagement from '../plugin'

  export let currentSpace: Ref<TestProject> | undefined

  const myAcc = getCurrentAccount()
  const query = createQuery()

  let hasProject = currentSpace !== undefined
  let loading = !hasProject
  if (!hasProject) {
    query.query(
      testManagement.class.TestProject,
      { archived: false, members: myAcc.uuid },
      (res) => {
        hasProject = res.length > 0
        loading = false
      },
      { limit: 1, projection: { _id: 1 } }
    )
  }

  async function handleCreateProject (): Promise<void> {
    await showCreateProjectPopup()
  }

  async function handleCreateTestSuite (): Promise<void> {
    await showCreateTestSuitePopup(currentSpace, testManagement.ids.NoParent)
  }

  async function handleCreateTestCase (): Promise<void> {
    if (currentSpace !== undefined) {
      await showCreateTestCasePopup(currentSpace, getTestSuiteIdFromLocation())
    } else {
      console.warn('Project is not defined')
    }
  }

  async function handleDropdownItemSelected (res?: SelectPopupValueType['id']): Promise<void> {
    switch (res) {
      case testManagement.string.CreateProject: {
        await handleCreateProject()
        return
      }
      case testManagement.string.CreateTestSuite: {
        await handleCreateTestSuite()
        return
      }
      case testManagement.string.CreateTestCase: {
        await handleCreateTestCase()
      }
    }
  }

  const commonDropdownItems = [
    {
      id: testManagement.string.CreateTestSuite,
      label: testManagement.string.CreateTestSuite,
      icon: testManagement.icon.TestSuite
    },
    {
      id: testManagement.string.CreateTestCase,
      label: testManagement.string.CreateTestCase,
      icon: testManagement.icon.TestCase
    }
  ]

  const dropdownItems = hasAccountRole(myAcc, AccountRole.User)
    ? [
        {
          id: testManagement.string.CreateProject,
          label: testManagement.string.CreateProject,
          icon: testManagement.icon.TestProject
        },
        ...commonDropdownItems
      ]
    : commonDropdownItems
</script>

{#if loading}
  <Loading shrink />
{:else}
  <div class="antiNav-subheader">
    {#if hasProject}
      <ButtonWithDropdown
        icon={IconAdd}
        justify={'left'}
        kind={'primary'}
        label={testManagement.string.CreateTestCase}
        dropdownIcon={IconDropdown}
        {dropdownItems}
        disabled={currentSpace === undefined}
        on:click={handleCreateTestCase}
        on:dropdown-selected={(ev) => {
          void handleDropdownItemSelected(ev.detail)
        }}
      />
    {:else}
      <Button
        icon={IconAdd}
        label={testManagement.string.CreateProject}
        justify={'left'}
        width={'100%'}
        kind={'primary'}
        gap={'large'}
        on:click={showCreateProjectPopup}
      />
    {/if}
  </div>
{/if}
