<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->

<script lang="ts">
</script>

<div class="notification" on:click|stopPropagation|preventDefault>
  <div class="marker" />
  <slot />
</div>

<style lang="scss">
  .notification {
    position: relative;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    user-select: none;

    &:first-child .marker {
      border-top-left-radius: 0.5rem;
      border-top-right-radius: 0.5rem;
    }

    &:last-child .marker {
      border-bottom-left-radius: 0.5rem;
      border-bottom-right-radius: 0.5rem;
    }

    &:hover .marker {
      border-radius: 0.5rem;
      background: var(--global-primary-LinkColor);
    }
  }

  .marker {
    position: absolute;
    width: 0.25rem;
    height: 100%;
    background: var(--global-ui-highlight-BackgroundColor);
    border-radius: 0;
  }
</style>
