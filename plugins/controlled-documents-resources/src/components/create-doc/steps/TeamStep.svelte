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
  import { Data, Ref, TypedSpace } from '@hcengineering/core'
  import { Employee } from '@hcengineering/contact'
  import { type ControlledDocument } from '@hcengineering/controlled-documents'

  import DocTeam from '../../document/DocTeam.svelte'

  export let space: Ref<TypedSpace>
  export let docObject: Data<ControlledDocument> | undefined = undefined

  async function handleUpdate ({
    detail
  }: {
    detail: { type: 'reviewers' | 'approvers', users: Ref<Employee>[] }
  }): Promise<void> {
    if (docObject === undefined) {
      return
    }

    const { type, users } = detail

    docObject[type] = users
  }
</script>

{#if docObject !== undefined}
  <div class="root">
    <DocTeam controlledDoc={docObject} {space} on:update={handleUpdate} />
  </div>
{/if}

<style lang="scss">
  .root {
    height: 100%;
    width: 100%;
  }
</style>
