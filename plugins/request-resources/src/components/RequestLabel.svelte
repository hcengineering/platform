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
  import { Request, RequestStatus } from '@hcengineering/request'
  import { Button, ButtonSize, Label, ProgressCircle, eventToHTMLElement, showPopup } from '@hcengineering/ui'
  import { DocNavLink } from '@hcengineering/view-resources'
  import request from '../plugin'
  import RequestDetailPopup from './RequestDetailPopup.svelte'
  import RequestStatusPresenter from './RequestStatusPresenter.svelte'

  export let value: Request
  export let isOwnTx: boolean = false
  export let size: ButtonSize = 'inline'
  export let inline: boolean = true
</script>

<div class="flex">
  {#if isOwnTx}
    <div class="lower" class:inline-presenter={inline}>
      <Label label={request.string.Request} />
    </div>
  {:else}
    <DocNavLink {inline} object={value}>
      <div class="flex-presenter lower" class:inline-presenter={inline}>
        <Label label={request.string.Request} />
      </div>
    </DocNavLink>
    <Button
      {size}
      kind="link"
      on:click={(ev) => {
        ev.stopPropagation()
        showPopup(RequestDetailPopup, { value }, eventToHTMLElement(ev))
      }}
    >
      <svelte:fragment slot="content">
        {#if value.status !== RequestStatus.Active}
          <RequestStatusPresenter value={value.status} />
        {:else}
          <div class="flex-row-center content-color text-sm pointer-events-none">
            <div class="mr-1">
              <ProgressCircle
                max={value.requiredApprovesCount}
                value={value.approved.length}
                size={'inline'}
                accented
              />
            </div>
            {value.approved.length}/{value.requiredApprovesCount}
          </div>
        {/if}
      </svelte:fragment>
    </Button>
  {/if}
</div>
