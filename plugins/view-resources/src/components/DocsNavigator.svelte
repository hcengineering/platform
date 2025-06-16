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
  import { Doc } from '@hcengineering/core'
  import { Breadcrumbs, BreadcrumbsModel, getClient } from '@hcengineering/presentation'
  import { AttributeModel } from '@hcengineering/view'
  import { getObjectPresenter, restrictionStore } from '../utils'

  export let elements: readonly Doc[]
  export let maxWidth: string | undefined = undefined

  const client = getClient()

  async function getBreadcrumbsModels (elements: readonly Doc[]): Promise<readonly BreadcrumbsModel[]> {
    if (elements.length === 0) {
      return []
    }

    const models: BreadcrumbsModel[] = []
    for (const element of elements) {
      const attributeModel: AttributeModel | undefined = await getObjectPresenter(client, element._class, { key: '' })

      if (attributeModel) {
        const breadcrumbsModel: BreadcrumbsModel = {
          component: attributeModel.presenter,
          props: {
            shouldShowAvatar: false,
            noUnderline: true,
            noSelect: true,
            shrink: true,
            ...(attributeModel.props ?? {}),
            value: element
          }
        }

        models.push(breadcrumbsModel)
      }
    }

    return models
  }
</script>

{#await getBreadcrumbsModels(elements) then models}
  {#if models.length > 0}
    <Breadcrumbs {models} disabled={$restrictionStore.disableNavigation} {maxWidth} />
  {/if}
{/await}
