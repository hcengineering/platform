<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { Timestamp } from '@hcengineering/core'

  export let time: Timestamp

  const dispatch = createEventDispatcher()

  let displayTime = time
  let notified = false
  let intervalId: any | undefined = undefined

  function applyTimer (time: number): void {
    if (intervalId !== undefined) {
      clearInterval(intervalId)
    }

    displayTime = Math.max(0, time - Date.now())
    notified = false
    intervalId = setInterval(() => {
      displayTime = Math.max(0, time - Date.now())

      if (displayTime === 0 && !notified) {
        notified = true
        dispatch('timeout')
      }
    }, 1000)
  }

  export function restart (time: number): void {
    applyTimer(time)
  }

  $: applyTimer(time)

  onDestroy(() => {
    if (intervalId !== undefined) {
      clearInterval(intervalId)
    }
  })

  function getDisplayTime (time: number): string {
    const options: Intl.DateTimeFormatOptions = { minute: 'numeric', second: 'numeric' }

    return new Date(time).toLocaleString('default', options)
  }
</script>

{#if displayTime > 0}
  {getDisplayTime(displayTime)}
{/if}
