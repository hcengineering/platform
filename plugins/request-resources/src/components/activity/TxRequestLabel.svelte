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
  import { createQuery } from '@hcengineering/presentation'
  import { Request } from '@hcengineering/request'
  import RequestLabel from '../RequestLabel.svelte'

  export let value: Request
  export let isOwnTx: boolean
  let request: Request | undefined = undefined

  const query = createQuery()
  query.query(value._class, { _id: value._id }, (res) => {
    ;[request] = res
  })
</script>

{#if request}
  <RequestLabel value={request} {isOwnTx} />
{/if}
