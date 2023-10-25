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
  import task, { ProjectType, ProjectTypeCategory } from '@hcengineering/task'
  import { Component, Icon, Label, navigate, resolvedLocationStore } from '@hcengineering/ui'
  import setting from '../../plugin'

  import Categories from './Categories.svelte'
  import Types from './Types.svelte'
  import { onDestroy } from 'svelte'
  import { Ref } from '@hcengineering/core'

  let category: ProjectTypeCategory | undefined
  let type: ProjectType | undefined
  let categoryId: Ref<ProjectTypeCategory> | undefined
  let typeId: Ref<ProjectType> | undefined

  onDestroy(
    resolvedLocationStore.subscribe((p) => {
      if (p.query != null) {
        categoryId = (p.query?.categoryId as Ref<ProjectTypeCategory>) ?? undefined
        typeId = (p.query?.typeId as Ref<ProjectType>) ?? undefined
        delete p.query
        navigate(p, false)
      }
    })
  )
</script>

<div class="antiComponent">
  <div class="ac-header short divide">
    <div class="ac-header__icon"><Icon icon={task.icon.ManageTemplates} size={'medium'} /></div>
    <div class="ac-header__title"><Label label={setting.string.ManageProjects} /></div>
  </div>
  <div class="ac-body columns hScroll">
    <div class="ac-column">
      <Categories bind:category {categoryId} />
    </div>
    <div class="ac-column">
      {#if category !== undefined}
        <Types category={category._id} bind:type {typeId} />
      {/if}
    </div>
    <div class="ac-column max">
      {#if type !== undefined}
        <Component is={task.component.ProjectEditor} props={{ type, category }} />
      {/if}
    </div>
  </div>
</div>
