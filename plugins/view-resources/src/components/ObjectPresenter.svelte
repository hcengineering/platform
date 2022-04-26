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
  import type { Class, Doc, Ref } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { AttributeModel } from '@anticrm/view'
  import { getObjectPresenter } from '../utils'

  export let objectId: Ref<Doc>
  export let _class: Ref<Class<Doc>>
  export let value: Doc | undefined
  export let props: Record<string, any> = {}

  const client = getClient()
  let presenter: AttributeModel | undefined

  const docQuery = createQuery()
  let doc: Doc | undefined

  $: if (value === undefined) {
    docQuery.query(_class, { _id: objectId }, (r) => { doc = r.shift() })
  } else {
    doc = value
  }

  $: if (doc !== undefined) {
    getObjectPresenter(client, doc._class, { key: '' }).then(p => {
      presenter = p
    })
  }
</script>

{#if presenter}  
  <svelte:component this={presenter.presenter} value={doc} {...props} inline />
{/if}
