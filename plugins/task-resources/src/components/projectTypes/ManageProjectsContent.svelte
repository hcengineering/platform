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
  import { Ref, WithLookup } from '@hcengineering/core'
  import { ProjectType } from '@hcengineering/task'
  import { Location, resolvedLocationStore, resizeObserver } from '@hcengineering/ui'

  import { onDestroy } from 'svelte'
  import { typeStore } from '../../'
  import ProjectEditor from './ProjectEditor.svelte'

  export let visibleNav: boolean = true

  let visibleSecondNav: boolean = true
  let type: WithLookup<ProjectType> | undefined
  let typeId: Ref<ProjectType> | undefined

  onDestroy(
    resolvedLocationStore.subscribe((loc) => {
      void (async (loc: Location): Promise<void> => {
        typeId = loc.path[4] as Ref<ProjectType>
      })(loc)
    })
  )

  $: type = typeId !== undefined ? $typeStore.get(typeId) : undefined
</script>

<div
  class="hulyComponent"
  use:resizeObserver={(element) => {
    visibleSecondNav = element.clientWidth > 720
  }}
>
  {#if type !== undefined}
    <ProjectEditor {type} descriptor={type.$lookup?.descriptor} {visibleNav} {visibleSecondNav} on:change />
  {/if}
</div>
