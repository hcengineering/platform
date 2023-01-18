<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Request } from '@hcengineering/request'
  import { Label } from '@hcengineering/ui'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import { createEventDispatcher, onMount } from 'svelte'
  import request from '../plugin'
  import RequestActions from './RequestActions.svelte'
  import RequestLabel from './RequestLabel.svelte'
  import TxView from './TxView.svelte'

  export let object: Request

  const dispatch = createEventDispatcher()

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'status'], activityOptions: { enabled: true, showInput: false } })
  })
</script>

{#if object !== undefined}
  <div class="flex-row-center gap-1 mb-2">
    <span class="mr-1"><Label label={request.string.For} /></span>
    <ObjectPresenter objectId={object.tx.objectId} _class={object.tx.objectClass} />
    <TxView tx={object.tx} />
  </div>
  <RequestLabel value={object} />
  <RequestActions value={object} />
{/if}
