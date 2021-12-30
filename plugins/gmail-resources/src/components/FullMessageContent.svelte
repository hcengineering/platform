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
  export let content: string

  let editor: HTMLDivElement
  $: if (editor) editor.innerHTML = content
</script>

<div bind:this={editor} class="input clear-mins" />

<style lang="scss">
  .input {
    overflow: auto;
    padding: 1rem;
    background-color: #fff;
    color: #1f212b;
    border-radius: .5rem;

    :global(a) {
      font: inherit;
      font-weight: 500;
      text-decoration: initial;
      color: initial;
      outline: initial;
      &:hover {
        color: initial;
        text-decoration: initial;
      }
      &:active {
        color: initial;
        text-decoration: initial;
      }
      &:visited {
        color: initial;
      }
    }
  }
</style>
