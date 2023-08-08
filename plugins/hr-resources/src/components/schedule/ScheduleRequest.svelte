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
  import hr, { Request, RequestType } from '@hcengineering/hr'
  import { getClient } from '@hcengineering/presentation'
  import { closeTooltip, Icon, Label, showPopup } from '@hcengineering/ui'
  import { ContextMenu } from '@hcengineering/view-resources'

  export let request: Request
  export let editable: boolean = false
  export let shouldShowDescription: boolean = true

  const client = getClient()

  async function getType (request: Request): Promise<RequestType | undefined> {
    return await client.findOne(hr.class.RequestType, {
      _id: request.type
    })
  }

  function isAvailable (type: RequestType): boolean {
    return type.value >= 0
  }

  function click (e: MouseEvent, request: Request) {
    if (!editable) return
    e.stopPropagation()
    e.preventDefault()
    closeTooltip()
    showPopup(ContextMenu, { object: request }, e.target as HTMLElement)
  }

  $: description = shouldShowDescription ? request.description.replace(/<[^>]*>/g, '').trim() : ''
</script>

{#await getType(request) then type}
  {#if type}
    {@const available = isAvailable(type)}

    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="request flex-row-center flex-gap-2"
      class:flex-center={!shouldShowDescription}
      class:request--available={available}
      class:request--unavailable={!available}
      class:cursor-pointer={editable}
      on:click={(e) => click(e, request)}
    >
      <Icon
        icon={type.icon}
        size={'small'}
        fill={available ? 'var(--highlight-blue-01)' : 'var(--primary-color-orange-02)'}
      />

      {#if shouldShowDescription}
        <span class="overflow-label">
          {#if description !== ''}
            {description}
          {:else if type}
            <Label label={type.label} />
          {/if}
        </span>
      {/if}
    </div>
  {/if}
{/await}

<style lang="scss">
  .request {
    color: var(--theme-calendar-event-caption-color);

    border-radius: 0.25rem;
    height: 100%;
    width: 100%;

    padding: 0rem 0.5rem;
    overflow: hidden;
  }

  .request--available {
    border: 1px solid var(--theme-calendar-event-available-color);
    background-color: var(--theme-calendar-event-available-bgcolor);
  }

  .request--unavailable {
    border: 1px solid var(--theme-calendar-event-unavailable-color);
    background-color: var(--theme-calendar-event-unavailable-bgcolor);
  }
</style>
