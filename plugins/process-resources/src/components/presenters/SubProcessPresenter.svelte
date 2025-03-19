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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Process, MethodParams, Step } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'
  import process from '../../plugin'
  import { Ref } from '@hcengineering/core'

  export let step: Step<Process>
  export let params: MethodParams<Process>

  const client = getClient()
  $: method = client.getModel().findAllSync(process.class.Method, { _id: step.methodId })[0]

  let value: Process | undefined = undefined

  const query = createQuery()

  $: if (params._id !== undefined) {
    query.query(process.class.Process, { _id: params._id as Ref<Process> }, (res) => {
      value = res[0]
    })
  } else {
    query.unsubscribe()
    value = undefined
  }
</script>

<Label label={method.label} />
{#if value}
  - {value?.name}
{/if}
