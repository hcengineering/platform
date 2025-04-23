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
  import { requestMediaAccess } from '@hcengineering/media'
  import { Button, IconMoreH, StatusBarButton, showPopup } from '@hcengineering/ui'

  import { camAccess, micAccess, sessions } from '../stores'

  import IconCam from './icons/Cam.svelte'
  import MediaPopup from './MediaPopup.svelte'

  export let disabled = false

  $: active = $sessions.length > 0

  async function ensureMediaAccess (): Promise<void> {
    await $camAccess.ready
    await $micAccess.ready
    const requestAudio = $camAccess.state === 'prompt'
    const requestVideo = $micAccess.state === 'prompt'
    if (requestAudio || requestVideo) {
      const kind = requestAudio && requestVideo ? undefined : requestAudio ? 'audioinput' : 'videoinput'
      await requestMediaAccess(kind)
    }
  }

  let element: HTMLElement
  let pressed = false

  async function openPopup (): Promise<void> {
    pressed = true

    await ensureMediaAccess()
    showPopup(MediaPopup, {}, element, () => {
      pressed = false
    })
  }
</script>

{#if active}
  <Button
    noFocus
    icon={IconMoreH}
    kind={'icon'}
    size={'x-small'}
    padding={'0 .5rem'}
    borderStyle={'none'}
    {disabled}
    on:click={openPopup}
  />
{:else}
  <StatusBarButton bind:element icon={IconCam} {pressed} on:click={openPopup} />
{/if}
