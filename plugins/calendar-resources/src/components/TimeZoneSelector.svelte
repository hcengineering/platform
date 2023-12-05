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
  import {
    Button,
    TimeZone,
    TimeZonesPopup,
    convertTimeZone,
    eventToHTMLElement,
    getTimeZoneName,
    showPopup
  } from '@hcengineering/ui'
  import calendar from '../plugin'

  export let timeZone: string
  export let disabled: boolean = false

  function open (e: MouseEvent) {
    const timeZones: TimeZone[] = []
    const tzs: string[] = []
    if (!Intl.supportedValuesOf) console.log('Your browser does not support Intl.supportedValuesOf().')
    else for (const timeZone of Intl.supportedValuesOf('timeZone')) tzs.push(timeZone)

    if (tzs.length > 0) tzs.forEach((tz) => timeZones.push(convertTimeZone(tz)))
    showPopup(
      TimeZonesPopup,
      {
        timeZones,
        withAdd: false,
        selected: timeZone,
        count: 1,
        reset: null
      },
      eventToHTMLElement(e),
      (result) => {
        if (result !== undefined) {
          timeZone = result
        }
      }
    )
  }
</script>

<Button {disabled} label={calendar.string.TimeZone} kind={'ghost'} padding={'0 .5rem'} justify={'left'} on:click={open}>
  <svelte:fragment slot="content">
    <span class="ml-2 content-darker-color">
      {getTimeZoneName(timeZone)}
    </span>
  </svelte:fragment>
</Button>
