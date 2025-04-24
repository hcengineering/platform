<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Button, eventToHTMLElement, showPopup } from '@hcengineering/ui'

  import love from '../plugin'
  import { isSharingEnabled } from '../utils'

  import SharingStatePopup from './SharingStatePopup.svelte'
  import IconShare from './icons/Share.svelte'

  function handleClick (ev: MouseEvent): void {
    showPopup(SharingStatePopup, {}, eventToHTMLElement(ev))
  }
</script>

{#if $isSharingEnabled}
  <Button
    noFocus
    icon={IconShare}
    iconProps={{ fill: 'var(--theme-state-positive-color)' }}
    kind={'icon'}
    size={'x-small'}
    padding={'0 .25rem'}
    showTooltip={{ label: love.string.Sharing }}
    on:click={handleClick}
  />
{/if}
