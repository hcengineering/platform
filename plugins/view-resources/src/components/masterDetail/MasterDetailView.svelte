<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Class, Doc, DocumentQuery, FindOptions, Ref, Space, WithLookup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { AnyComponent } from '@hcengineering/ui'
  import view, { BuildModelKey, ViewOptionModel, ViewOptions, Viewlet, ViewletDescriptor } from '@hcengineering/view'
  // import { ComponentNavigator } from '@hcengineering/workbench-resources'
  import { getClient } from '@hcengineering/presentation'
  import SplitView from './SplitView.svelte'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<Doc> = {}
  export let options: FindOptions<Doc> | undefined = undefined
  export let config: Array<string | BuildModelKey>
  export let viewlet: WithLookup<Viewlet>

  // Per _class configuration, if supported.
  export let configurations: Record<Ref<Class<Doc>>, Viewlet['config']> | undefined
  export let createItemDialog: AnyComponent | undefined
  export let createItemDialogProps: Record<string, any> | undefined = undefined
  export let createItemLabel: IntlString | undefined
  export let createItemEvent: string | undefined
  export let viewOptions: ViewOptions

  export let viewOptionsConfig: ViewOptionModel[] | undefined = undefined
  export let props: Record<string, any> = {}

  let viewlets: Array<ViewletDescriptor> | undefined = undefined
  let viewletA: ViewletDescriptor | undefined = undefined

  const client = getClient()

  $: void getViewlets(viewlet?._id)

  async function getViewlets (viewletId: Ref<Viewlet>) {
    if (viewlet === undefined) return
    console.log('getViewlets', viewletId)
    const vid = viewlet?.masterDetailOptions?.viewletA
    viewletA = await client.findOne(
      view.class.ViewletDescriptor,
      { _id: viewlet?.masterDetailOptions?.viewletB }
    )
    viewlets = await client.findAll(
      view.class.ViewletDescriptor,
      { _id: { $in: [viewlet?.masterDetailOptions?.viewletA, viewlet?.masterDetailOptions?.viewletB] } },
      {
        lookup: {
          descriptor: view.class.ViewletDescriptor
        }
      }
    )
    console.log('viewlets', viewlets)
  }

  function selected (e: CustomEvent<any>): void {
    console.log('selected', e.detail)
  }

  $: console.log('masterDetailOptions', viewlet?.masterDetailOptions)
</script>

{#if viewlet !== undefined && viewlets !== undefined && viewlets.length > 1}
  <SplitView
    query={query}
    {space}
    mainComponent={viewlets[1].component}
    mainComponentProps={{
      _class: viewlet?.masterDetailOptions?.classB,
      space,
      options,
      config: viewlet.config,
      viewlet,
      viewOptions,
      viewOptionsConfig: viewlet.viewOptions?.other,
      query,
      totalQuery: query,
      ...viewlet.props
    }}
    navigationComponent={viewlets[0].component}
    navigationComponentProps={{
      _class: viewlet?.masterDetailOptions?.classA
    }}
    on:select={selected}
  />
{/if}
