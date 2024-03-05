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
  import type { Doc } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { AttributeModel } from '@hcengineering/view'
  import { getObjectPresenter } from '@hcengineering/view-resources'
  import { ActivityReference } from '@hcengineering/activity'

  export let value: ActivityReference
  export let inline = true

  const client = getClient()
  const srcDocQuery = createQuery()

  let srcDoc: Doc | undefined
  let presenter: AttributeModel | undefined

  $: srcDocQuery.query(value.srcDocClass, { _id: value.srcDocId }, (r) => {
    srcDoc = r.shift()
  })

  $: if (srcDoc !== undefined) {
    void getObjectPresenter(client, srcDoc._class, { key: '' }).then((result) => {
      presenter = result
    })
  }
</script>

{#if presenter}
  <span class="labels-row">
    <svelte:component this={presenter.presenter} value={srcDoc} {inline} embedded shouldShowAvatar={false} />
  </span>
{/if}
