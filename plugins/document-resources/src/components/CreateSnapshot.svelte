<!--
//
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
//
-->
<script lang="ts">
  import { Document } from '@hcengineering/document'
  import { Card } from '@hcengineering/presentation'
  import { EditBox } from '@hcengineering/ui'
  import document from '../plugin'

  export let doc: Document

  let name = ''

  async function create (): Promise<void> {
    // TODO implement me
    // const snapshot = await takeSnapshot(doc.content, name)
    // await client.addCollection(
    //   document.class.DocumentSnapshot,
    //   doc.space,
    //   doc._id,
    //   document.class.Document,
    //   'snapshots',
    //   {
    //     name,
    //     content: snapshot
    //   }
    // )
  }
</script>

<Card label={document.string.Snapshot} okAction={create} canSave={name.trim().length > 0} on:close>
  <div class="flex-row-center clear-mins">
    <EditBox placeholder={document.string.Name} bind:value={name} kind={'large-style'} autoFocus />
  </div>
</Card>
