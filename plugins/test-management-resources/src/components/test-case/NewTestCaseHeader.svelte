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
  import { getClient } from '@hcengineering/presentation'
  import { Button, IconAdd, showPopup } from '@hcengineering/ui'
  import testManagement from '../../plugin'
  import CreateTestCase from './CreateTestCase.svelte'
  import { openDoc } from '@hcengineering/view-resources'

  const client = getClient()

  async function newProduct (): Promise<void> {
    showPopup(CreateTestCase, {}, 'top', async (id) => {
      if (id != null) {
        const doc = await client.findOne(testManagement.class.TestCase, { _id: id })
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
    label={testManagement.string.CreateTestCase}
    kind={'primary'}
    justify={'left'}
    width="100%"
    on:click={newProduct}
  />
</div>
