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
  import { Request } from '@anticrm/hr'
  import { Asset } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import { areDatesEqual, getPlatformColorForText, Icon, showPopup } from '@anticrm/ui'
  import { ContextMenu } from '@anticrm/view-resources'

  export let requests: Request[]
  export let date: Date
  export let editable: boolean = false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  function getPercent (date: Date): number {
    const minutes = date.getHours() * 60 + date.getMinutes()
    const total = 24 * 60
    return (minutes / total) * 100
  }

  function getStyle (request: Request, date: Date): string {
    let res = `background-color: ${getPlatformColorForText(request._class)};`
    let top = 0
    if (areDatesEqual(new Date(request.date), date)) {
      top = getPercent(new Date(request.date))
      res += ` top: ${top}%;`
    }
    if (areDatesEqual(new Date(request.dueDate), date)) {
      const percent = getPercent(new Date(request.dueDate))
      res += ` height: ${percent - top}%;`
    }
    return res
  }

  function getIcon (request: Request): Asset | undefined {
    return hierarchy.getClass(request._class).icon
  }

  function click (e: MouseEvent, request: Request) {
    if (!editable) return
    e.stopPropagation()
    e.preventDefault()
    showPopup(ContextMenu, { object: request }, e.target as HTMLElement)
  }
</script>

<div class="w-full h-full relative">
  {#each requests as request}
    <div
      class="request"
      class:cursor-pointer={editable}
      style={getStyle(request, date)}
      on:click={(e) => {
        click(e, request)
      }}
    >
      {#if areDatesEqual(new Date(request.date), date) || date.getDate() === 1}
        {@const icon = getIcon(request)}
        {#if icon}
          <Icon {icon} size="large" />
        {/if}
      {/if}
    </div>
  {/each}
</div>

<style lang="scss">
  .request {
    position: absolute;
    height: 100%;
    width: 100%;
  }
</style>
