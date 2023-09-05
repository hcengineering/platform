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
  import { Breadcrumbs, BreadcrumbsModel, getClient } from '@hcengineering/presentation'
  import { getObjectPresenter, isAttachedDoc } from '../utils'
  import { AttributeModel } from '@hcengineering/view'

  export let element: Doc | AttachedDoc

  const client = getClient()

  async function getParents (doc: AttachedDoc): Promise<readonly Doc[]> {
    const parents: Doc[] = []

    let currentDoc: Doc | undefined = doc

    while (currentDoc && isAttachedDoc(currentDoc)) {
      const parent: Doc | undefined = await client.findOne(currentDoc.attachedToClass, { _id: currentDoc.attachedTo })

      if (parent) {
        currentDoc = parent
        parents.push(parent)
      } else {
        currentDoc = undefined
      }
    }

    return parents.reverse()
  }

  async function getBreadcrumbsModels (doc: typeof element): Promise<readonly BreadcrumbsModel[]> {
    if (!isAttachedDoc(doc)) {
      return []
    }

    const parents = await getParents(doc)
    if (parents.length === 0) {
      return []
    }

    const models: BreadcrumbsModel[] = []
    for (const parent of parents) {
      const attributeModel: AttributeModel | undefined = await getObjectPresenter(client, parent._class, { key: '' })

      if (attributeModel) {
        const breadcrumbsModel: BreadcrumbsModel = {
          component: attributeModel.presenter,
          props: { shouldShowAvatar: false, ...(attributeModel.props ?? {}), value: parent }
        }

        models.push(breadcrumbsModel)
      }
    }

    return models
  }
</script>

{#await getBreadcrumbsModels(element) then models}
  {#if models.length > 0}
    <Breadcrumbs {models} gap="none" />
  {/if}
{/await}
