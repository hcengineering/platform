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
  import { IconClose } from '..'
</script>

<button
  class="flex font-medium-14 max-w-60 search-picker-item"
  on:click
>
  <span>
    <slot/>
  </span>
  <div class="search-picker-item-icon">
    <IconClose size="small" />
  </div>
</button>

<style lang="scss">
  .search-picker-item {
    position: relative;
    height: var(--global-small-Size);
    border: none;
    padding: var(--spacing-0_5);
    color: var(--tag-on-accent-PorpoiseText);
    background-color: var(--global-accent-BackgroundColor);
    border-radius: var(--small-BorderRadius);
    
    &:after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: var(--small-BorderRadius);
      overflow: hidden;
      background-color: transparent;
      pointer-events: none;
    }

    &:hover:after {
      background-color: var(--global-ui-hover-OverlayColor);
    }

    &:active:after {
      background-color: var(--global-ui-active-OverlayColor);
    }

    span {
      padding: 0 var(--spacing-1);
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }
  }

  .search-picker-item-icon {
    padding-right: var(--spacing-0_25);
  }
</style>