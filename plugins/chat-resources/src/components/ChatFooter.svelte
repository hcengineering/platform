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

  import ChatInput from './ChatInput.svelte'

  export let card: Card
  export let height: number | undefined = undefined

  let _height: number | undefined | null

  $: if (_height != null) {
    // Add 1 for the border
    height = _height + 1
  }
</script>

<div class="chat__footer" bind:clientHeight={_height}>
  <ChatInput {card} />
</div>

<style lang="scss">
  .chat__footer {
    display: flex;
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    padding: 12px;

    border-top: 1px solid var(--next-divider-color);
    backdrop-filter: blur(5px);
    min-height: 100px;
    position: absolute;
    bottom: 0;
    left: 0;
    max-height: 50%;
  }
</style>
