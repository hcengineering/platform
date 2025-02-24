<!--
//
// Copyright © 2022, 2023, 2024 Hardcore Engineering Inc.
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
  import { type Doc } from '@hcengineering/core'
  import { encodeDocumentId } from '@hcengineering/collaborator-client'
  import { getAttribute, getClient, KeyedAttribute } from '@hcengineering/presentation'
  import { CollaborationIds } from '@hcengineering/text-editor'
  import { onDestroy, setContext } from 'svelte'

  import { createTiptapCollaborationData } from '../provider/utils'
  import { Provider } from '../provider/types'

  export let object: Doc
  export let attribute: KeyedAttribute

  const client = getClient()

  let provider: Provider | undefined

  $: objectClass = object._class
  $: objectId = object._id
  $: objectAttr = attribute.key
  $: content = getAttribute(client, object, attribute)

  $: collaborativeDoc = { objectClass, objectId, objectAttr }

  // while editing, collaborative doc may change, hence we need to
  // build stable key to ensure we don't do unnecessary updates
  $: documentId = encodeDocumentId('', collaborativeDoc)

  let _documentId: string | undefined

  $: if (_documentId !== documentId) {
    _documentId = documentId

    if (provider !== undefined) {
      void provider.destroy()
    }

    const data = createTiptapCollaborationData(collaborativeDoc, content)
    provider = data.provider
    setContext(CollaborationIds.Doc, data.ydoc)
    setContext(CollaborationIds.Provider, provider)
  }

  onDestroy(() => {
    void provider?.destroy()
  })
</script>

{#key documentId}
  <slot />
{/key}
