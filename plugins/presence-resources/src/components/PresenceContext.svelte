<!--
// Copyright © 2024 Anticrm Platform Contributors.
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
  import { type Doc } from '@hcengineering/core'
  import { getCurrentEmployee } from '@hcengineering/contact'
  import { onMount } from 'svelte'

  import { updatePresence, deletePresence } from '../presence'

  export let object: Doc
  export let presenceId: string | undefined = undefined
  export let presenceTtlSeconds: number = 5
  export let presenceUpdateSeconds: number = 2

  const personId = getCurrentEmployee()

  async function doUpdatePresence (): Promise<void> {
    const presence = { personId, objectId: presenceId ?? object._id, objectClass: object._class }
    await updatePresence(presence, presenceTtlSeconds)
  }

  async function doDeletePresence (object: Doc, presenceId?: string): Promise<void> {
    const presence = { personId, objectId: presenceId ?? object._id, objectClass: object._class }
    await deletePresence(presence)
  }

  onMount(() => {
    void doUpdatePresence()
    const interval = setInterval(doUpdatePresence, presenceUpdateSeconds * 1000)
    return () => {
      clearInterval(interval)
      void doDeletePresence(object, presenceId)
    }
  })

  let previousObject: Doc = object
  let prevPresenceId: string | undefined = presenceId

  $: if (object !== undefined && (object._id !== previousObject._id || object._class !== previousObject._class || presenceId !== prevPresenceId)) {
    void doDeletePresence(previousObject)
    previousObject = object
    prevPresenceId = presenceId
    void doUpdatePresence()
  }
</script>

<slot />
