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
  import { createEventDispatcher, onMount } from 'svelte'
  import Spinner from './Spinner.svelte'

  export let shrink: boolean = false
  export let label: string = ''

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
  <div data-label={label} class="inner" class:labeled={label !== ''}>
    <Spinner />
  </div>
</div>

<style lang="scss">
  .spinner-container {
    display: flex;
    justify-content: center;
    align-items: center;

    &.fullSize {
      width: 100%;
      height: 100%;
    }
  }

  @keyframes makeVisible {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .spinner-container .inner {
    opacity: 0;
    animation-name: makeVisible;
    animation-duration: 0.25s;
    animation-delay: 0.1s;
    animation-fill-mode: forwards;

    &.labeled {
      position: relative;

      &::after {
        position: absolute;
        content: attr(data-label);
        bottom: -0.75rem;
        left: 50%;
        text-transform: uppercase;
        font-weight: 500;
        font-size: 0.5rem;
        color: var(--dark-color);
        transform: translateX(-50%);
      }
    }
  }
</style>
