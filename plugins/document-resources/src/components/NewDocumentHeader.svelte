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
  import { Ref, Space } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Button, showPopup, IconAdd } from '@hcengineering/ui'
  import { openDoc } from '@hcengineering/view-resources'
  import document from '../plugin'
  import { getDocumentIdFromFragment } from '../utils'
  import CreateDocument from './CreateDocument.svelte'

  export let currentSpace: Ref<Space> | undefined
  export let currentFragment: string | undefined

  const client = getClient()

  $: parent = getDocumentIdFromFragment(currentFragment ?? '')

  async function newDocument (): Promise<void> {
    showPopup(CreateDocument, { space: currentSpace, parent }, 'top', async (id) => {
      if (id !== undefined && id !== null) {
        const doc = await client.findOne(document.class.Document, { _id: id })
        if (doc !== undefined) {
          void openDoc(client.getHierarchy(), doc)
        }
      }
    })
  }
</script>

<div class="antiNav-subheader">
  <Button
    icon={IconAdd}
    label={document.string.CreateDocument}
    justify={'left'}
    width={'100%'}
    kind={'primary'}
    gap={'large'}
    on:click={newDocument}
  />
</div>
