<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
  import { Label, TimeSince } from '@hcengineering/ui'
  import { Timestamp } from '@hcengineering/core'

  import communication from '../../plugin'

  export let lastReply: Date | string | number | undefined = undefined

  function getTime (date: Date | string | number | undefined): Timestamp | undefined {
    if (date === undefined) return undefined
    if (date instanceof Date) return date.getTime()
    if (typeof date === 'number') return date

    return new Date(date).getTime()
  }
  $: time = getTime(lastReply)
</script>

{#if time !== undefined}
  <span class="thread__last-reply">
    <Label label={communication.string.LastReply} />
    <TimeSince value={time} />
  </span>
{/if}

<style lang="scss">
  .thread__last-reply {
    color: var(--global-tertiary-TextColor);
    font-size: 0.75rem;
    font-weight: 400;
  }
</style>
