<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { AttachedDoc, Doc } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { isAttachedDoc } from '../utils'
  import DocsNavigator from './DocsNavigator.svelte'

  export let element: Doc | AttachedDoc

  const client = getClient()

  function hasParent (doc: Doc | AttachedDoc): boolean {
    return 'parent' in doc && doc.parent != null
  }

  async function getParents (doc: Doc | AttachedDoc): Promise<readonly Doc[]> {
    if (!isAttachedDoc(doc) && !hasParent(doc)) {
      return []
    }

    const parents: Doc[] = []

    let currentDoc: Doc | undefined = doc

    while (currentDoc && (isAttachedDoc(currentDoc) || hasParent(currentDoc))) {
      const parent: Doc | undefined = isAttachedDoc(currentDoc)
        ? await client.findOne(currentDoc.attachedToClass, { _id: currentDoc.attachedTo })
        : await client.findOne(currentDoc._class, { _id: currentDoc.parent })

      if (parent) {
        currentDoc = parent
        parents.push(parent)
      } else {
        currentDoc = undefined
      }
    }

    return parents.reverse()
  }
</script>

{#await getParents(element) then parents}
  <DocsNavigator elements={parents} />
{/await}
