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
  import { type Class, type Ref, SortingOrder } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Loading } from '@hcengineering/ui'
  import documents, { type ControlledDocument, type Project } from '@hcengineering/controlled-documents'

  import EditDocPanel from './EditDocPanel.svelte'

  export let _id: Ref<ControlledDocument>
  export let _class: Ref<Class<ControlledDocument>>
  export let embedded: boolean = false
  export let withClose: boolean = true

  const client = getClient()

  let project: Ref<Project> | undefined

  $: void findProject(_id)

  async function findProject (document: Ref<ControlledDocument>): Promise<void> {
    if (_id === undefined) {
      project = undefined
      return
    }

    const res = await client.findOne(
      documents.class.ProjectDocument,
      { document },
      {
        lookup: {
          project: documents.class.Project
        },
        sort: {
          '$lookup.project.createdOn': SortingOrder.Descending
        },
        limit: 1
      }
    )

    project = res?.project ?? documents.ids.NoProject
  }
</script>

{#if project !== undefined}
  <EditDocPanel {_id} {_class} {project} {embedded} {withClose} on:close />
{:else}
  <Loading />
{/if}
