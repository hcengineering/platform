<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  export let top: number
</script>

<div class="drop-marker" style="top: {top}px;" />

<style lang="scss">
  .drop-marker {
    pointer-events: none;
    position: absolute;
    z-index: 100;
    height: 0.125rem;
    background-color: var(--primary-button-focused);

    left: 0.75rem;
    right: 0.75rem;
    top: 10rem;
  }
</style>
