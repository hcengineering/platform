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
  import { Class, Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Project } from '@hcengineering/controlled-documents'

  import documents from '../../plugin'
  import ProjectPresenter from './ProjectPresenter.svelte'

  export let value: Ref<Project> | undefined
  export let _class: Ref<Class<Project>> = documents.class.Project
  export let inline: boolean = false
  export let accent: boolean = false

  let project: Project | undefined

  const query = createQuery()
  $: value !== undefined &&
    query.query(_class, { _id: value }, (res) => {
      ;[project] = res
    })
</script>

{#if value}
  <ProjectPresenter value={project} {inline} {accent} />
{/if}
