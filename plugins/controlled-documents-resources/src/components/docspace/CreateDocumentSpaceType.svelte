<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { Data, SpaceTypeDescriptor, generateId } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import documents, { DocumentSpaceType, DocumentSpaceTypeDescriptor } from '@hcengineering/controlled-documents'
  import { createSpaceType } from '@hcengineering/setting'

  const client = getClient()

  export let descriptor: SpaceTypeDescriptor
  export let name: string = ''
  export const handleTypeCreated: () => Promise<void> = createType

  $: docDescriptor = descriptor as DocumentSpaceTypeDescriptor

  const dispatch = createEventDispatcher()

  async function createType (): Promise<void> {
    if (docDescriptor === undefined) {
      return
    }

    const data: Omit<Data<DocumentSpaceType>, 'targetClass'> = {
      name,
      descriptor: descriptor._id,
      roles: 0,
      projects: docDescriptor.withProjects === true
    }

    await createSpaceType(client, data, generateId(), documents.class.DocumentSpaceType)

    dispatch('close')
  }
</script>
