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
  import { AttachedDoc, Doc, Ref, Class } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { isAttachedDoc } from '../utils'
  import DocsNavigator from './DocsNavigator.svelte'

  export let element: Doc | AttachedDoc

  const client = getClient()

  function hasParent (doc: Doc | AttachedDoc): boolean {
    return 'parent' in doc && doc.parent != null
  }

  function getParentId (doc: Doc | AttachedDoc): Ref<Doc> {
    return isAttachedDoc(doc) ? doc.attachedTo : (doc as any).parent
  }

  function getParentClass (doc: Doc | AttachedDoc): Ref<Class<Doc>> {
    return isAttachedDoc(doc) ? doc.attachedToClass : doc._class
  }

  function withParent (doc: Doc | AttachedDoc): boolean {
    return isAttachedDoc(doc) || hasParent(doc)
  }

  async function getParents (_id: Ref<Doc>, _class: Ref<Class<Doc>>, showParents: boolean): Promise<readonly Doc[]> {
    if (!showParents) {
      return []
    }

    const parents: Doc[] = []

    let currentDoc: Doc | undefined = element

    while (currentDoc && withParent(currentDoc)) {
      const _id = getParentId(currentDoc)
      const _class = getParentClass(currentDoc)
      const parent: Doc | undefined = await client.findOne(_class, { _id })

      if (parent) {
        currentDoc = parent
        parents.push(parent)
      } else {
        currentDoc = undefined
      }
    }

    return parents.reverse()
  }

  let parents: readonly Doc[] = []

  $: parentId = getParentId(element)
  $: parentClass = getParentClass(element)
  $: showParents = withParent(element)
  $: getParents(parentId, parentClass, showParents).then((res) => {
    parents = res
  })
</script>

<DocsNavigator elements={parents} />
