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
  import { getMetadata } from '@hcengineering/platform'
  import contact from '@hcengineering/contact'
  import { getCurrentTheme, isThemeDark } from '@hcengineering/theme'

  export let disabled: boolean = false
  const backgroundImage = isThemeDark(getCurrentTheme())
    ? contact.image.ProfileBackground
    : contact.image.ProfileBackgroundLight

  $: style = disabled ? 'gray' : ''
</script>

<div class="user-popup {style}">
  <slot name="header" />
  {#if !disabled}
    <div class="image-container">
      <div
        class="img {style}"
        style={`background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 25%, var(--theme-popup-color) 95%), url("${getMetadata(backgroundImage)}"); background-size: cover;`}
      />
    </div>
  {/if}
  <div class="action-container">
    <slot name="actions" />
  </div>
  <div class="content">
    <slot name="content" />
  </div>
</div>

<style lang="scss">
  .user-popup {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 0;
    width: 20rem;
  }
  .content,
  .content {
    padding-left: 0.25rem;
    isolation: isolate;
    order: 0;
    width: 100%;

    .main-container {
      padding: 1rem 0;
      gap: 1rem;
    }

    .button {
      position: absolute;
      width: 1.75rem;
      height: 1.75rem;
      right: 1rem;
      top: 1rem;
      border-radius: 0.375rem;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }

  .image-container {
    /* image-container */
    width: 100%;
    min-height: 6.5rem;
    display: flex;

    /* Inside auto layout */
    flex: none;
    order: 0;
    align-self: stretch;
    flex-grow: 0;
    margin: -1.75rem 0;
    z-index: -100;
  }

  .action-container {
    position: absolute;
    top: 0;
    right: 0;
    padding: 1rem;
    display: flex;
    align-items: flex-start;
    flex: none;
    align-self: stretch;
    flex-grow: 0;
  }

  .img {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    height: 5.5rem;

    border-radius: 0;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    z-index: -100;

    &.gray {
      filter: gray;
      -webkit-filter: grayscale(1);
      filter: grayscale(1);
    }
  }
</style>
