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

  export let card: Card | undefined = undefined
</script>

<div class="chat-header"></div>

<style lang="scss">
  .chat-header {
    display: flex;
    width: 100%;
    height: 4rem;
    min-height: 4rem;
    max-height: 4rem;
    border-bottom: 1px solid var(--next-panel-color-border);
  }
</style>
