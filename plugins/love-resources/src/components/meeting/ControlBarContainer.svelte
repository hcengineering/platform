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
  export let size: 'small' | 'big' = 'big'
</script>

<div class="bar" data-size={size}>
  <div class="row">
    <div class="left"><slot name="left" /></div>
    <div class="center"><slot name="center" /></div>
    <div class="right"><slot name="right" /></div>
  </div>
</div>

<style lang="scss">
  .bar {
    --g: 0.5rem;
  }

  .bar {
    padding: 1rem;
    border-top: 1px solid var(--theme-divider-color);
    container-type: inline-size;
    width: 100%;
  }

  .row {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--g);
  }
  .left,
  .center,
  .right {
    display: flex;
    align-items: center;
    gap: var(--g);
    white-space: nowrap;
    min-width: 0;
  }
  .center {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }

  @container (max-width: 350px) {
    .bar[data-size='small'] .row {
      justify-content: center;
      gap: var(--g);
    }
    .bar[data-size='small'] .left,
    .bar[data-size='small'] .center,
    .bar[data-size='small'] .right {
      display: contents;
    }
    .bar[data-size='small'] .center {
      position: static;
      transform: none;
    }
  }

  @container (max-width: 960px) {
    .bar[data-size='big'] .row {
      justify-content: center;
      gap: var(--g);
    }
    .bar[data-size='big'] .left,
    .bar[data-size='big'] .center,
    .bar[data-size='big'] .right {
      display: contents;
    }
    .bar[data-size='big'] .center {
      position: static;
      transform: none;
    }
  }
</style>
