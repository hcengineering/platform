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
  import { Card } from '@hcengineering/card'
  import { Attachments } from '@hcengineering/attachment-resources'
  import { createEventDispatcher, onMount } from 'svelte'
  import { getClient } from '@hcengineering/presentation'
  import { canChangeDoc } from '@hcengineering/view-resources'
  import { permissionsStore } from '@hcengineering/contact-resources'

  export let readonly: boolean = false
  export let doc: Card
  export let hidden: boolean = false

  const dispatch = createEventDispatcher()

  onMount(() => {
    if ((doc.attachments ?? 0) === 0) {
      dispatch('loaded')
    }
  })

  const client = getClient()
  const h = client.getHierarchy()

  $: updatePermissionForbidden = doc && !canChangeDoc(doc?._class, doc?.space, $permissionsStore)
</script>

{#if !hidden}
  <div class="section-attachments">
    <Attachments
      objectId={doc._id}
      _class={doc._class}
      space={doc.space}
      attachments={doc.attachments ?? 0}
      readonly={readonly ||
        updatePermissionForbidden ||
        h.getAncestors(doc._class).some((p) => doc.readonlySections?.includes(p))}
      on:attachments={() => dispatch('loaded')}
    />
  </div>
{/if}

<style lang="scss">
  .section-attachments {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0 1rem;
  }
</style>
