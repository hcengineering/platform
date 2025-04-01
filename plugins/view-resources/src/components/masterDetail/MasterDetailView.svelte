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
  import core, { Doc, DocumentQuery, FindOptions, Ref, Space, WithLookup, mergeQueries } from '@hcengineering/core'
  import { MasterDetailConfig, ViewOptions, Viewlet, ViewletDescriptor } from '@hcengineering/view'
  import { getClient } from '@hcengineering/presentation'

  import MasterDetailBrowser from './MasterDetailBrowser.svelte'
  import view from '../../plugin'

  export let space: Ref<Space> | undefined = undefined
  export let query: DocumentQuery<Doc> = {}
  export let parentQuery: DocumentQuery<Doc> = {}
  export let options: FindOptions<Doc> | undefined = undefined
  export let viewlet: WithLookup<Viewlet>

  // Per _class configuration, if supported.
  export let viewOptions: ViewOptions

  let _id: Ref<Doc> | undefined = undefined
  let _query: DocumentQuery<Doc> = {}

  let parentView: ViewletDescriptor | undefined = undefined
  let detailView: ViewletDescriptor | undefined = undefined

  const client = getClient()

  $: void getViewlets(viewlet?._id)

  async function getViewlets (viewletId: Ref<Viewlet>): Promise<void> {
    if (viewlet === undefined) return
    const views: MasterDetailConfig[] = viewlet?.masterDetailOptions?.views ?? []
    const results = await client.findAll(view.class.ViewletDescriptor, { _id: { $in: [views[0].view, views[1].view] } })
    parentView = results.find((v) => v._id === views[0].view)
    detailView = results.find((v) => v._id === views[1].view)
  }

  async function selected (e: CustomEvent<any>): Promise<void> {
    const views: MasterDetailConfig[] = viewlet?.masterDetailOptions?.views ?? []
    if (detailView === undefined) return
    if (detailView?._id === view.viewlet.Document) {
      _id = e.detail
    } else {
      let association = await client.findOne(core.class.Association, {
        classA: views[0].class,
        classB: views[1].class
      })
      association =
        association ??
        (await client.findOne(core.class.Association, {
          classB: views[0].class,
          classA: views[1].class
        }))
      if (association === undefined) return
      const relations = await client.findAll(core.class.Relation, {
        association: association._id,
        docA: e.detail
      })
      const ids = relations.flatMap((r) => [r.docA, r.docB])
      _query = mergeQueries(query ?? {}, { _id: { $in: ids } })
    }
  }

  $: remainingViews = viewlet?.masterDetailOptions?.views?.slice(1) ?? []
  $: isSimpleView = (viewlet?.masterDetailOptions?.views?.length ?? 0) <= 2
  $: detailViewComponent = isSimpleView
    ? detailView?.component ?? view.component.EditDoc
    : viewlet?.$lookup?.descriptor?.component ?? view.component.MasterDetailBrowser
  $: nestedViewlet = isSimpleView
    ? undefined
    : {
        ...viewlet,
        masterDetailOptions: {
          ...viewlet?.masterDetailOptions,
          views: remainingViews
        }
      }
  $: detailProps = isSimpleView
    ? {
        _class: viewlet?.masterDetailOptions?.views[1].class,
        space,
        options,
        config: viewlet.config,
        viewlet,
        viewOptions,
        viewOptionsConfig: viewlet.viewOptions?.other,
        totalQuery: _query,
        ...viewlet.props,
        embedded: true,
        _id
      }
    : {
        space,
        parentQuery: _query,
        options,
        viewlet: nestedViewlet,
        viewOptions
      }
</script>

{#if viewlet !== undefined && parentView !== undefined && detailView !== undefined && viewlet.masterDetailOptions !== undefined}
  <MasterDetailBrowser
    query={_query}
    {space}
    detailComponent={detailViewComponent}
    detailComponentProps={detailProps}
    masterComponent={parentView.component}
    masterComponentProps={{
      _class: viewlet?.masterDetailOptions?.views[0].class,
      plainList: true
    }}
    createMasterComponent={viewlet?.masterDetailOptions?.views[1]?.createComponent}
    createMasterComponentProps={{ _class: viewlet?.masterDetailOptions?.views[0].class }}
    createDetailComponent={viewlet?.masterDetailOptions?.views[0]?.createComponent}
    createDetailComponentProps={{ _class: viewlet?.masterDetailOptions?.views[1].class }}
    detailClass={viewlet.masterDetailOptions.views[1].class}
    parentClass={viewlet.masterDetailOptions.views[0].class}
    isNested={!isSimpleView}
    on:select={selected}
  />
{/if}
