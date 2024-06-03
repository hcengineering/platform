<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Label, Scroller } from '@hcengineering/ui'
  import { NavLink } from '@hcengineering/view-resources'
  import { DocumentSpace, Project } from '@hcengineering/controlled-documents'
  import { createEventDispatcher } from 'svelte'

  import documents from '../../plugin'

  import ProjectSelectorPopupItem from './ProjectSelectorPopupItem.svelte'

  export let space: Ref<DocumentSpace>
  export let showReadonly: boolean = true

  const dispatch = createEventDispatcher()

  let projects: Project[] = []

  const query = createQuery()
  query.query(
    documents.class.Project,
    {
      space,
      ...(showReadonly ? {} : { readonly: false })
    },
    (res) => {
      projects = res
    },
    {
      sort: {
        name: SortingOrder.Ascending
      }
    }
  )

  function selectProject (project: Ref<Project>): void {
    dispatch('close', project)
  }
</script>

<div class="hulyPopup-container">
  <div class="header flex-between">
    <div class="header__label">
      <Label label={documents.string.Projects} />
    </div>
    <div class="header__link">
      <NavLink {space} special={'projects'}>
        <Label label={documents.string.ViewAll} />
      </NavLink>
    </div>
  </div>
  <Scroller padding={'var(--spacing-0_5)'} gap={'flex-gap-0-5'}>
    {#each projects as project}
      <ProjectSelectorPopupItem
        {project}
        onClick={() => {
          selectProject(project._id)
        }}
      />
    {/each}
  </Scroller>
  <div class="menu-space" />
</div>

<style lang="scss">
  .header {
    padding: 1rem 0.5rem 0.75rem;
    border-bottom: 1px solid var(--theme-popup-divider);

    &__label {
      text-transform: uppercase;
      padding: 0.25rem 0.5rem;
      background-color: var(--global-ui-highlight-BackgroundColor);
      color: var(--global-secondary-TextColor);
      border-radius: var(--extra-small-BorderRadius);
    }

    &__link {
      padding: 0.25rem 0.5rem;

      &:hover {
        text-transform: underline;
      }
    }
  }
</style>
