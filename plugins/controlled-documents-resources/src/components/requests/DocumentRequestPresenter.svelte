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
  import { Doc } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Button, Label, ProgressCircle, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import { Request, RequestStatus } from '@hcengineering/request'
  import { IntlString } from '@hcengineering/platform'
  import { RequestStatusPresenter, RequestDetailPopup } from '@hcengineering/request-resources'

  export let value: Request
  export let label: IntlString
  export let showApproverDetails: boolean = true
  export let shouldShowAvatar = true

  const client = getClient()

  let object: Doc | undefined

  $: void getObject(value)
  async function getObject (value: Request): Promise<void> {
    const attachedToClass = value.attachedToClass
    object = await client.findOne(attachedToClass, { _id: value.attachedTo })
  }
</script>

<div class="flex-row-center flex-gap-2">
  <Label {label} />
  {#if object}
    <ObjectPresenter objectId={object._id} _class={object._class} props={{ disableClick: true }} />
  {/if}
  {#if shouldShowAvatar}
    <Button
      size="small"
      kind="link"
      on:click={(ev) => {
        ev.stopPropagation()
        showPopup(RequestDetailPopup, { value }, eventToHTMLElement(ev))
      }}
    >
      <svelte:fragment slot="content">
        {#if value.status !== RequestStatus.Active}
          <RequestStatusPresenter value={value.status} />
        {:else if showApproverDetails}
          <div class="flex-row-center content-color text-sm pointer-events-none">
            <div class="mr-1">
              <ProgressCircle max={value.requiredApprovesCount} value={value.approved.length} size="inline" primary />
            </div>
            {value.approved.length}/{value.requiredApprovesCount}
          </div>
        {/if}
      </svelte:fragment>
    </Button>
  {/if}
</div>
