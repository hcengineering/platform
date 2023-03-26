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
  import { Doc, TxCUD } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { getObjectPresenter } from '@hcengineering/view-resources'
  import { AttributeModel } from '@hcengineering/view'

  export let value: TxCUD<Doc>
  export let onNavigate: () => void | undefined

  const query = createQuery()
  const client = getClient()

  let presenter: AttributeModel | undefined
  let doc: Doc | undefined

  $: query.query(value.objectClass, { _id: value.objectId }, (res) => {
    doc = res.shift()
  })

  $: getObjectPresenter(client, value.objectClass, { key: '' }).then((p) => {
    presenter = p
  })
</script>

{#if doc && presenter}
  <svelte:component this={presenter.presenter} value={doc} onClick={onNavigate} shouldShowAvatar noUnderline />
{/if}
