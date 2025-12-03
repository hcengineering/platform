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
  import { createEventDispatcher, onMount } from 'svelte'
  import SquareSpinner from './icons/SquareSpinner.svelte'

  export let shrink: boolean = false
  export let label: string = ''
  export let size: 'small' | 'medium' | 'large' = 'small'

  const dispatch = createEventDispatcher()
  let timer: any
  onMount(() => {
    timer = setTimeout(() => {
      dispatch('progress')
    }, 50)
    return () => {
      clearTimeout(timer)
    }
  })
</script>

<div class="spinner-container" class:fullSize={!shrink}>
  <div data-label={label} class="flex-row-center flex-gap-2" class:labeled={label !== ''}>
    <SquareSpinner {size} />
    <slot />
  </div>
  <slot name="actions" />
</div>

<style lang="scss">
  .spinner-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    flex-direction: column;

    &.fullSize {
      width: 100%;
      height: 100%;
    }
  }
</style>
