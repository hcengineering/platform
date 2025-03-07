<!--
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
  import { AccountRole, Ref, Space, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import {
    Button,
    ButtonWithDropdown,
    IconAdd,
    IconDropdown,
    Loading,
    SelectPopupValueType,
    showPopup
  } from '@hcengineering/ui'
  import { openDoc } from '@hcengineering/view-resources'
  import { Analytics } from '@hcengineering/analytics'
  import { DocumentEvents } from '@hcengineering/document'

  import document from '../plugin'
  import { getDocumentIdFromFragment } from '../utils'
  import CreateDocument from './CreateDocument.svelte'
  import CreateTeamspace from './teamspace/CreateTeamspace.svelte'

  export let currentSpace: Ref<Space> | undefined
  export let currentFragment: string | undefined

  const client = getClient()
  const query = createQuery()
  const myAcc = getCurrentAccount()

  let loading = true
  let hasTeamspace = false
  query.query(
    document.class.Teamspace,
    { archived: false, members: myAcc.uuid },
    (res) => {
      hasTeamspace = res.length > 0
      loading = false
    },
    { limit: 1, projection: { _id: 1 } }
  )

  $: parent = getDocumentIdFromFragment(currentFragment ?? '')

  async function newDocument (): Promise<void> {
    Analytics.handleEvent(DocumentEvents.CreateDocumentButtonClicked)
    showPopup(CreateDocument, { space: currentSpace, parent }, 'top', async (id) => {
      if (id !== undefined && id !== null) {
        const doc = await client.findOne(document.class.Document, { _id: id })
        if (doc !== undefined) {
          void openDoc(client.getHierarchy(), doc)
        }
      }
    })
  }

  async function newTeamspace (): Promise<void> {
    showPopup(CreateTeamspace, {}, 'top')
  }

  async function dropdownItemSelected (res?: SelectPopupValueType['id']): Promise<void> {
    if (res === document.string.CreateDocument) {
      await newDocument()
    } else if (res === document.string.CreateTeamspace) {
      await newTeamspace()
    }
  }

  const dropdownItems = hasAccountRole(myAcc, AccountRole.User)
    ? [
        { id: document.string.CreateDocument, label: document.string.CreateDocument },
        { id: document.string.CreateTeamspace, label: document.string.CreateTeamspace }
      ]
    : [{ id: document.string.CreateDocument, label: document.string.CreateDocument }]
</script>

{#if loading}
  <Loading shrink />
{:else}
  <div class="antiNav-subheader">
    {#if hasTeamspace}
      <ButtonWithDropdown
        icon={IconAdd}
        justify={'left'}
        kind={'primary'}
        label={document.string.CreateDocument}
        on:click={newDocument}
        mainButtonId={'new-document'}
        dropdownIcon={IconDropdown}
        {dropdownItems}
        on:dropdown-selected={(ev) => {
          void dropdownItemSelected(ev.detail)
        }}
      />
    {:else}
      <Button
        id={'new-teamspace'}
        icon={IconAdd}
        label={document.string.CreateTeamspace}
        justify={'left'}
        width={'100%'}
        kind={'primary'}
        gap={'large'}
        on:click={newTeamspace}
      />
    {/if}
  </div>
{/if}
