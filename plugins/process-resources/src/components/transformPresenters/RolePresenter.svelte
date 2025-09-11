<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Role } from '@hcengineering/card'
  import { getClient } from '@hcengineering/presentation'
  import { SelectedContextFunc } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'

  export let contextValue: SelectedContextFunc

  const client = getClient()
  const func = client.getModel().findObject(contextValue.func)
  const role: Role | undefined =
    contextValue.props?.target !== undefined ? client.getModel().findObject(contextValue.props?.target) : undefined
</script>

{#if role !== undefined && func !== undefined}
  <div>
    <Label label={func.label} />: {role.name}
  </div>
{/if}
