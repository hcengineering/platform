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
  import ui, {
    Button,
    ButtonKind,
    DatePopup,
    SimpleDatePopup,
    SimpleTimePopup,
    eventToHTMLElement,
    showPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import DateLocalePresenter from './DateLocalePresenter.svelte'

  export let date: number
  export let direction: 'vertical' | 'horizontal' = 'vertical'
  export let showDate: boolean = true
  export let withoutTime: boolean
  export let kind: ButtonKind = 'ghost'
  export let disabled: boolean = false

  const dispatch = createEventDispatcher()

  function timeClick (e: MouseEvent) {
    if (showDate) {
      showPopup(SimpleTimePopup, { currentDate: new Date(date) }, eventToHTMLElement(e), (res) => {
        if (res.value) {
          date = res.value.getTime()
          dispatch('update', date)
        }
      })
    } else {
      showPopup(
        DatePopup,
        { currentDate: new Date(date), withTime: !withoutTime, label: ui.string.SelectDate, noShift: true },
        undefined,
        (res) => {
          if (res) {
            date = res.value.getTime()
            dispatch('update', date)
          }
        }
      )
    }
  }

  function dateClick (e: MouseEvent) {
    showPopup(SimpleDatePopup, { currentDate: new Date(date) }, eventToHTMLElement(e), (res) => {
      if (res) {
        date = res.getTime()
        dispatch('update', date)
      }
    })
  }
</script>

<div class="container" class:vertical={direction === 'vertical'} class:horizontal={direction === 'horizontal'}>
  {#if showDate || withoutTime}
    <Button {kind} on:click={dateClick} {disabled}>
      <div slot="content">
        <DateLocalePresenter {date} />
      </div>
    </Button>
  {/if}
  {#if !withoutTime}
    <Button {kind} on:click={timeClick} {disabled}>
      <div slot="content">
        {new Date(date).toLocaleTimeString('default', { hour: 'numeric', minute: '2-digit' })}
      </div>
    </Button>
  {/if}
</div>

<style lang="scss">
  .container {
    display: flex;
    align-items: center;
  }

  .vertical {
    flex-direction: column;
  }

  .horizontal {
    flex-direction: row;
  }
</style>
