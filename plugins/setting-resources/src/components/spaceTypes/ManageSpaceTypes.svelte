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
  import { onDestroy } from 'svelte'
  import core, { Ref, SpaceType, WithLookup } from '@hcengineering/core'
  import { Location, getCurrentResolvedLocation, navigate, resolvedLocationStore } from '@hcengineering/ui'
  import { createQuery, hasResource } from '@hcengineering/presentation'
  import { Resource } from '@hcengineering/platform'

  import { clearSettingsStore } from '../../store'
  import SpaceTypes from './SpaceTypes.svelte'

  export let categoryName: string

  let selectedTypeId: Ref<WithLookup<SpaceType>> | undefined

  onDestroy(resolvedLocationStore.subscribe(handleLocationChanged))

  function handleLocationChanged (loc: Location): void {
    selectedTypeId = loc.path[4] as Ref<SpaceType>
  }

  let types: WithLookup<SpaceType>[] = []
  const typesQuery = createQuery()
  $: typesQuery.query(
    core.class.SpaceType,
    {},
    (result) => {
      types = result.filter((p) => hasResource(p.descriptor as any as Resource<any>))
    },
    {
      lookup: {
        descriptor: core.class.SpaceTypeDescriptor
      }
    }
  )

  function selectProjectType (id: string): void {
    clearSettingsStore()
    const loc = getCurrentResolvedLocation()
    loc.path[3] = categoryName
    loc.path[4] = id
    loc.path.length = 5
    navigate(loc)
  }

  function handleTypeChange (event: CustomEvent): void {
    selectProjectType(event.detail)
  }
</script>

<SpaceTypes {selectedTypeId} {types} on:change={handleTypeChange} />
