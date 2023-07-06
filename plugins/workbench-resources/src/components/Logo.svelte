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
  export let mini: boolean = false
  export let workspace: string
</script>

<div class="antiLogo red" class:mini>{workspace?.toUpperCase()?.[0]}</div>

<style lang="scss">
  .antiLogo {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    font-weight: 500;
    color: var(--accented-button-color);
    border-radius: 0.25rem;
    outline: none;
    cursor: pointer;

    &:hover {
      opacity: 0.8;
    }
    &:not(.mini) {
      width: 2rem;
      height: 2rem;
    }
    &.mini {
      width: 1.5rem;
      height: 1.5rem;
    }
    &.red {
      background-color: rgb(246, 105, 77);
    }
    &.blue {
      background-color: #2b5190;
    }
  }
</style>
