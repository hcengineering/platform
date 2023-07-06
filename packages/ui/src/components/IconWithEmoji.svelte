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
  import { IconSize } from '../types'

  export let icon: number
  export let size: IconSize

  let value: string = ''
  $: try {
    value = String.fromCodePoint(icon)
  } catch (err) {}
</script>

<div class="emoji-{size} flex-row-center emoji">
  {value}
</div>

<style lang="scss">
  .emoji {
    display: flex;
    align-items: center;
    justify-content: center;
    color: black;
  }
  .emoji-inline {
    width: 1em;
    height: 1em;
    font-size: 1rem;
  }
  .emoji-x-small {
    width: 0.75rem;
    height: 0.75rem;
    font-size: 0.75rem;
  }
  .emoji-small {
    width: 1rem;
    height: 1rem;
    font-size: 0.8125rem;
  }
  .emoji-medium {
    width: 1.25rem;
    height: 1.25rem;
    font-size: 1.25rem;
  }
  .emoji-large {
    width: 1.5rem;
    height: 1.5rem;
    font-size: 1.5rem;
  }
  .emoji-full {
    width: inherit;
    height: inherit;
  }
  .emoji-x-small,
  .emoji-small,
  .emoji-medium,
  .emoji-large {
    flex-shrink: 0;
  }
</style>
