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
  import { Component, showPopup } from '@hcengineering/ui'
  import { Applet } from '@hcengineering/communication'
  import { createEventDispatcher } from 'svelte'

  import { AppletDraft } from '../../types'

  export let applet: AppletDraft
  export let model: Applet
  export let editing: boolean

  const dispatch = createEventDispatcher()
</script>

<Component
  is={model.previewComponent}
  props={{
    applet: model,
    params: applet.params,
    editing
  }}
  on:change={() => {
    showPopup(model.createComponent, { applet: model, params: applet.params }, 'center', (result) => {
      if (result != null) {
        dispatch('change', { ...applet, params: result })
      }
    })
  }}
  on:delete={() => {
    dispatch('delete', applet.id)
  }}
/>
