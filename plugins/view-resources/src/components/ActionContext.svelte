<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { generateId } from '@hcengineering/core'
  import { ViewContext } from '@hcengineering/view'
  import { onDestroy } from 'svelte'
  import { ContextStore, contextStore } from '../context'

  export let context: ViewContext

  const id = generateId()

  $: len = $contextStore.contexts.findIndex((it) => (it as any).id === id)

  onDestroy(() => {
    contextStore.update((t) => {
      return new ContextStore(t.contexts.slice(0, len ?? 0))
    })
  })

  $: {
    contextStore.update((cur) => {
      const pos = cur.contexts.findIndex((it) => (it as any).id === id)
      const newCur = {
        id,
        mode: context.mode,
        application: context.application ?? cur.contexts[(pos !== -1 ? pos : cur.contexts.length) - 1]?.application
      }
      if (pos === -1) {
        len = cur.contexts.length
        return new ContextStore([...cur.contexts, newCur])
      }
      len = pos
      return new ContextStore([...cur.contexts.slice(0, pos), newCur])
    })
  }
</script>
