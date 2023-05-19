<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { resizeObserver } from '@hcengineering/ui'
  import { afterUpdate } from 'svelte'
  import { fixedWidthStore } from '../utils'

  export let key: string
  export let justify: string = ''
  export let addClass: string | undefined = undefined

  let cWidth: number | undefined = undefined
  let prevKey = key

  afterUpdate(() => {
    if (cWidth !== undefined) {
      if (prevKey !== key) {
        $fixedWidthStore[prevKey] = 0
        $fixedWidthStore[key] = 0
        prevKey = key
        cWidth = undefined
      }
      if (cWidth && cWidth > ($fixedWidthStore[key] ?? 0)) $fixedWidthStore[key] = cWidth
    }
  })

  function resize (element: Element) {
    cWidth = element.clientWidth
    if (cWidth > ($fixedWidthStore[key] ?? 0)) $fixedWidthStore[key] = cWidth
  }
</script>

<div
  class="flex-no-shrink{addClass ? ` ${addClass}` : ''}"
  style:text-align={justify !== '' ? justify : ''}
  style:min-width={`${$fixedWidthStore[key] ?? 0}px`}
  use:resizeObserver={resize}
>
  <slot />
</div>
