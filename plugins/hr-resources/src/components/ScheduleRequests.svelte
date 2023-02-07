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
  import hr, { Request, RequestType } from '@hcengineering/hr'
  import { getClient } from '@hcengineering/presentation'
  import { closeTooltip, getPlatformColor, Icon, showPopup } from '@hcengineering/ui'
  import { ContextMenu } from '@hcengineering/view-resources'

  export let requests: Request[]
  // export let date: Date
  export let editable: boolean = false

  const client = getClient()

  async function getType (request: Request): Promise<RequestType | undefined> {
    return await client.findOne(hr.class.RequestType, {
      _id: request.type
    })
  }

  function getStyle (type: RequestType): string {
    let res = `background-color: ${getPlatformColor(type.color)};`
    if (Math.abs(type.value % 1) === 0.5) {
      res += ' height: 50%;'
    }
    return res
  }

  function click (e: MouseEvent, request: Request) {
    if (!editable) return
    e.stopPropagation()
    e.preventDefault()
    closeTooltip()
    showPopup(ContextMenu, { object: request }, e.target as HTMLElement)
  }
</script>

<div class="w-full h-full relative p-1 flex">
  {#each requests as request}
    {#await getType(request) then type}
      {#if type}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="request flex-center"
          class:cursor-pointer={editable}
          style={getStyle(type)}
          on:click={(e) => {
            click(e, request)
          }}
        >
          <Icon icon={type.icon} size={Math.abs(type.value % 1) !== 0.5 ? 'large' : 'small'} />
        </div>
      {/if}
    {/await}
  {/each}
</div>

<style lang="scss">
  .request {
    border-radius: 3px;
    flex-grow: 1;
    // height: 100%;
    width: 30px;
  }
</style>
