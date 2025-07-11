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
  import { Transition } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'
  import plugin from '../../plugin'

  export let transition: Transition
  export let direction: 'from' | 'to' | undefined = undefined

  const client = getClient()

  const query = createQuery()
  $: from = transition.from && client.getModel().findObject(transition.from)
  $: to = client.getModel().findObject(transition.to)

  $: query.query(plugin.class.State, { process: transition.process }, () => {
    from = transition.from && client.getModel().findObject(transition.from)
    to = client.getModel().findObject(transition.to)
  })
</script>

<span>
  {#if transition.to === null}
    <Label label={plugin.string.Rollback} />
  {:else}
    {#if direction !== 'from'}{from === null ? '⦳' : from?.title}{/if}
    →
    {#if direction !== 'to'}{to?.title}{/if}
  {/if}
</span>
