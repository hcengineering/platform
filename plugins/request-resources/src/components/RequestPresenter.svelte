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
  import request, { Request } from '@hcengineering/request'
  import { getClient } from '@hcengineering/presentation'
  import { Doc } from '@hcengineering/core'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import { Label } from '@hcengineering/ui'

  export let value: Request

  const client = getClient()

  let object: Doc | undefined

  $: void client.findOne(value.attachedToClass, { _id: value.attachedTo }).then((res) => {
    object = res
  })
</script>

<div class="flex-row-center flex-gap-2">
  <Label label={request.string.Request} />
  {#if object}
    <ObjectPresenter objectId={object._id} _class={object._class} props={{ disableClick: true }} />
  {/if}
</div>
