<!--
// Copyright © 2021 Anticrm Platform Contributors.
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
  import type { Backlink } from '@hcengineering/chunter'
  import type { Doc } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { AttributeModel } from '@hcengineering/view'
  import { getObjectPresenter } from '@hcengineering/view-resources'

  export let value: Backlink

  const client = getClient()
  let presenter: AttributeModel | undefined

  const docQuery = createQuery()
  const targetQuery = createQuery()
  let doc: Doc | undefined
  let target: Doc | undefined

  $: value.backlinkClass != null &&
    docQuery.query(value.backlinkClass, { _id: value.backlinkId }, (r) => {
      doc = r.shift()
    })

  $: targetQuery.query(value.attachedToClass, { _id: value.attachedTo }, (r) => {
    target = r.shift()
  })

  $: if (doc !== undefined) {
    getObjectPresenter(client, doc._class, { key: '' }).then((p) => {
      presenter = p
    })
  }
</script>

{#if presenter}
  <span class="labels-row">
    <svelte:component this={presenter.presenter} value={doc} inline />
  </span>
{/if}
