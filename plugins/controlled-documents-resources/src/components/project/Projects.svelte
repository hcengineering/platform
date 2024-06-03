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
  import { Class, Ref, WithLookup } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { DocumentSpace, DocumentSpaceType, Project } from '@hcengineering/controlled-documents'
  import documents from '../../plugin'
  import ProjectsView from './ProjectsView.svelte'

  export let currentSpace: Ref<DocumentSpace>

  const spaceQuery = createQuery()
  const spaceTypeQuery = createQuery()

  let space: DocumentSpace | undefined
  let spaceType: WithLookup<DocumentSpaceType> | undefined
  let _class: Ref<Class<Project>> | undefined

  $: query = { space: currentSpace }

  $: currentSpace &&
    spaceQuery.query(documents.class.DocumentSpace, { _id: currentSpace }, (res) => {
      ;[space] = res
    })

  $: space &&
    spaceTypeQuery.query(
      documents.class.DocumentSpaceType,
      { _id: space.type },
      (res) => {
        ;[spaceType] = res
        _class = spaceType.$lookup?.descriptor?.projectClass
      },
      {
        lookup: {
          descriptor: documents.class.DocumentSpaceTypeDescriptor
        }
      }
    )
</script>

{#if space && _class}
  <ProjectsView space={currentSpace} label={space.name} {_class} {query} />
{/if}
