<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { AccountArrayEditor } from '@hcengineering/contact-resources'
  import core, { AccountUuid, Collaborator, Doc } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import notification from '../plugin'

  export let object: Doc

  let collaborators: Collaborator[] = []

  const query = createQuery()
  const client = getClient()

  query.query(
    core.class.Collaborator,
    {
      attachedTo: object._id
    },
    (res) => {
      collaborators = res
    }
  )

  $: accounts = collaborators.map((c) => c.collaborator)

  async function change (res: AccountUuid[]): Promise<void> {
    const toAdd: AccountUuid[] = res.filter((a) => !accounts.includes(a))
    const toRemove: Collaborator[] = collaborators.filter((a) => !res.includes(a.collaborator))
    for (const account of toAdd) {
      await client.addCollection(core.class.Collaborator, object.space, object._id, object._class, 'collaborators', {
        collaborator: account
      })
    }
    for (const collaborator of toRemove) {
      await client.remove(collaborator)
    }
  }
</script>

<AccountArrayEditor label={notification.string.Collaborators} value={accounts} onChange={change} />
