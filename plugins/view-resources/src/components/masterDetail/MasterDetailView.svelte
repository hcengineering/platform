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
  import core, { Class, Doc, DocumentQuery, FindOptions, Ref, Space, WithLookup } from '@hcengineering/core'
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

  let _id: Ref<Doc> | undefined = undefined
  let childProps: Record<string, any> = {}

  let viewlets: Array<ViewletDescriptor> | undefined = undefined

  const client = getClient()

  $: void getViewlets(viewlet?._id)

  async function getViewlets (viewletId: Ref<Viewlet>) {
    if (viewlet === undefined) return
    viewlets = await client.findAll(
      view.class.ViewletDescriptor,
      { _id: { $in: [viewlet?.masterDetailOptions?.views[0].view, viewlet?.masterDetailOptions?.views[1].view] } },
      {
        lookup: {
          descriptor: view.class.ViewletDescriptor
        }
      }
    )
    console.log('viewlets', viewlets)
  }

  async function selected (e: CustomEvent<any>): void {
    console.log('selected', e.detail)
    if (viewlets?.[1] === undefined) return
    if (viewlets?.[1]._id === view.viewlet.Document) {
      childProps = {
        _id: e.detail
      }
    } else {
      let association = await client.findOne(core.class.Association, {
        classA: viewlet?.masterDetailOptions?.views[0].class,
        classB: viewlet?.masterDetailOptions?.views[1].class
      })
      association = association ?? await client.findOne(core.class.Association, {
        classB: viewlet?.masterDetailOptions?.views[0].class,
        classA: viewlet?.masterDetailOptions?.views[1].class
      })
      if (association === undefined) return
      const relations = await client.findAll(core.class.Relation, {
        association: association._id,
        docA: e.detail
      })
      const ids = relations.map(r => r._id)
      childProps = {
        query: {
          _id: { $in: ids }
        }
      }
    }
  }

  $: console.log('masterDetailOptions', viewlet?.masterDetailOptions)
</script>

{#if viewlet !== undefined && viewlets !== undefined && viewlets.length > 1}
  <SplitView
    query={query}
    {space}
    mainComponent={viewlets[1].component}
    mainComponentProps={{
      _class: viewlet?.masterDetailOptions?.views[1].class,
      space,
      options,
      config: viewlet.config,
      viewlet,
      viewOptions,
      viewOptionsConfig: viewlet.viewOptions?.other,
      totalQuery: query,
      ...viewlet.props,
      embedded: true,
      ...childProps
    }}
    navigationComponent={viewlets[0].component}
    navigationComponentProps={{
      _class: viewlet?.masterDetailOptions?.views[0].class
    }}
    on:select={selected}
  />
{/if}
