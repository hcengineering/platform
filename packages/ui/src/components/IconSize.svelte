<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  export let size: 'small' | 'medium' | 'large'
</script>

<div class={size}>
  <slot />
</div>

<style lang="scss">
  .small {
    width: 1.143em;
    height: 1.143em;
  }
  .medium {
    width: 1.429em;
    height: 1.429em;
  }
  .large {
    width: 1.714em;
    height: 1.714em;
  }
</style>
