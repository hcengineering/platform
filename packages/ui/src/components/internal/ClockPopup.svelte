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
  import { convertTimeZone, showPopup, TimeZone } from '../..'
  import ClockFace from './ClockFace.svelte'
  import TimeZonesPopup from '../TimeZonesPopup.svelte'

  const clockSize: string = '80px'
  const tzs: string[] = []
  const timeZones: TimeZone[] = []

  const localTZ: string = Intl.DateTimeFormat().resolvedOptions().timeZone
  let selectedTZ: string[] = [localTZ]
  const savedTZ = localStorage.getItem('TimeZones')
  if (savedTZ === null && selectedTZ[0] !== '') localStorage.setItem('TimeZones', JSON.stringify(selectedTZ))
  else if (savedTZ !== null) selectedTZ = JSON.parse(savedTZ)

  if (!Intl.supportedValuesOf) console.log('Your browser does not support Intl.supportedValuesOf().')
  else for (const timeZone of Intl.supportedValuesOf('timeZone')) tzs.push(timeZone)

  if (tzs.length > 0) tzs.forEach((tz) => timeZones.push(convertTimeZone(tz)))

  const saveTZ = (): void => {
    selectedTZ = selectedTZ
    localStorage.setItem('TimeZones', JSON.stringify(selectedTZ))
  }

  const changeTimeZone = (
    event: MouseEvent & { currentTarget: EventTarget & HTMLSpanElement },
    index: number
  ): void => {
    showPopup(
      TimeZonesPopup,
      {
        timeZones,
        selected: selectedTZ[index],
        count: selectedTZ.length,
        reset: selectedTZ.filter((tz) => tz === localTZ).length > 0 ? null : localTZ
      },
      event.currentTarget,
      (result) => {
        if (result !== undefined) {
          if (result === 'delete') selectedTZ.splice(index, 1)
          else selectedTZ[index] = result
          saveTZ()
        }
      },
      (result) => {
        if (result !== undefined) {
          if (result === 'reset') {
            selectedTZ[index] = localTZ
          } else selectedTZ = [result, ...selectedTZ]
          saveTZ()
        }
      }
    )
  }
</script>

<div class="antiPopup" style:flex-direction={'row'} style:padding={'12px'}>
  {#each selectedTZ as selected, i}
    <div class="statusPopup-option">
      <ClockFace bind:timeZone={selected} size={clockSize} />
      {#if selected !== ''}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span
          class="label overflow-label"
          style:max-width={clockSize}
          on:click={(ev) => {
            changeTimeZone(ev, i)
          }}
        >
          {convertTimeZone(selected).short}
        </span>
      {/if}
    </div>
  {/each}
</div>
