<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022, 2023 Hardcore Engineering Inc.
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
  import { IdMap, Ref, WithLookup, toIdMap } from '@hcengineering/core'
  import task, { ProjectType } from '@hcengineering/task'
  import { Location, getCurrentResolvedLocation, navigate, resolvedLocationStore } from '@hcengineering/ui'

  import { createQuery, hasResource } from '@hcengineering/presentation'
  import { onDestroy } from 'svelte'
  import Types from './Types.svelte'
  import { Resource } from '@hcengineering/platform'
  import { clearSettingsStore } from '@hcengineering/setting-resources'

  export let kind: 'navigation' | 'tools' | undefined
  export let categoryName: string
  let type: WithLookup<ProjectType> | undefined
  let typeId: Ref<ProjectType> | undefined

  onDestroy(
    resolvedLocationStore.subscribe((loc) => {
      void (async (loc: Location): Promise<void> => {
        typeId = loc.path[4] as Ref<ProjectType>
      })(loc)
    })
  )

  function selectProjectType (id: string): void {
    clearSettingsStore()
    const loc = getCurrentResolvedLocation()
    loc.path[3] = categoryName
    loc.path[4] = id
    loc.path.length = 5
    navigate(loc)
  }

  let types: WithLookup<ProjectType>[] = []
  let typeMap: IdMap<WithLookup<ProjectType>> = new Map()
  const query = createQuery()
  $: query.query(
    task.class.ProjectType,
    { archived: false },
    (result) => {
      types = result.filter((p) => hasResource(p.descriptor as any as Resource<any>))
    },
    {
      lookup: {
        descriptor: task.class.ProjectTypeDescriptor
      }
    }
  )

  $: typeMap = toIdMap(types)
  $: type = typeId !== undefined ? typeMap.get(typeId) : undefined
</script>

<Types
  {type}
  {typeId}
  {types}
  on:change={(evt) => {
    selectProjectType(evt.detail)
  }}
/>
