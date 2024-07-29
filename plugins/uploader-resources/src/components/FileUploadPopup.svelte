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
  import { themeStore } from '@hcengineering/ui'
  import { type FileUploadPopupOptions } from '@hcengineering/uploader'

  import { type Uppy } from '@uppy/core'
  import Dashboard from '@uppy/dashboard'
  import ScreenCapture from '@uppy/screen-capture'
  import Webcam from '@uppy/webcam'

  import { onMount, onDestroy, createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  export let uppy: Uppy<any, any>
  export let options: FileUploadPopupOptions

  let container: HTMLElement

  $: dark = $themeStore.dark

  function handleUpload (): void {
    dispatch('close', true)
  }

  onMount(() => {
    uppy.on('upload', handleUpload)

    uppy.use(ScreenCapture)
    uppy.use(Webcam)
    uppy.use(Dashboard, {
      id: 'huly:Dashboard',
      target: container,
      inline: true,
      width: 750,
      disableInformer: true,
      proudlyDisplayPoweredByUppy: false,
      theme: dark ? 'dark' : 'light',
      fileManagerSelectionType: options.fileManagerSelectionType
    })
  })

  onDestroy(() => {
    uppy.off('upload', handleUpload)
    const dashboard = uppy.getPlugin('huly:Dashboard')
    if (dashboard !== undefined) {
      uppy.removePlugin(dashboard)
    }
  })
</script>

<div class="uppy-Container" bind:this={container} />

<style lang="scss">
  @import '@uppy/core/dist/style.min.css';
  @import '@uppy/dashboard/dist/style.min.css';
  @import '@uppy/drag-drop/dist/style.min.css';
  @import '@uppy/progress-bar/dist/style.min.css';
  @import '@uppy/screen-capture/dist/style.min.css';
  @import '@uppy/webcam/dist/style.min.css';
</style>
