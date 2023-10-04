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
  import { getMetadata } from '@hcengineering/platform'
  import { Button, IconClose, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'
  import { concatLink } from '@hcengineering/core'
  import presentation from '@hcengineering/presentation'
  import { calendarId } from '@hcengineering/calendar'

  const dispatch = createEventDispatcher()

  let connecting = false
  const calendarUrl = getMetadata(calendar.metadata.CalendarServiceURL) ?? ''

  async function sendRequest (): Promise<void> {
    connecting = true
    const link = concatLink(calendarUrl, '/signin')
    const url = new URL(link)
    url.search = new URLSearchParams({
      redirectURL: (getMetadata(presentation.metadata.FrontUrl) ?? window.location.origin) + `/${calendarId}`
    }).toString()

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + getMetadata(presentation.metadata.Token),
        'Content-Type': 'application/json'
      }
    })
    const redirectTo = await res.text()
    window.open(redirectTo, '_blank', 'location=yes,height=870,width=720,scrollbars=yes,status=yes')
    dispatch('close')
  }
</script>

<div class="card">
  <div class="flex-between header">
    <div class="overflow-label fs-title"><Label label={calendar.string.ConnectCalendar} /></div>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
      class="tool"
      on:click={() => {
        dispatch('close')
      }}
    >
      <IconClose size={'small'} />
    </div>
  </div>
  <div class="content">
    <Label label={calendar.string.RedirectGoogle} />
    <img class="image" src={getMetadata(calendar.image.Permissions)} alt="" />
    <div class="footer">
      <Button label={calendar.string.Connect} kind={'accented'} disabled={connecting} on:click={sendRequest} />
    </div>
  </div>
</div>

<style lang="scss">
  .card {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 40rem;
    min-width: 40rem;
    max-width: 40rem;
    background-color: var(--popup-bg-hover);
    border-radius: 0.75rem;
    box-shadow: var(--popup-shadow);

    .header {
      flex-shrink: 0;
      margin: 1.75rem 1.75rem 1.25rem;

      .tool {
        cursor: pointer;
        &:hover {
          color: var(--caption-color);
        }
        &:active {
          color: var(--accent-color);
        }
      }
    }

    .content {
      flex-shrink: 0;
      flex-grow: 1;
      height: fit-content;
      margin: 0 1.75rem 0.5rem;
    }

    .image {
      width: 100%;
      height: auto;
      margin: 1rem;
    }

    .footer {
      display: flex;
      flex-direction: row-reverse;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0;
    }
  }
</style>
