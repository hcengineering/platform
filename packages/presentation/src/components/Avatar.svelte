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
  import chen from '../../img/chen.png'

  export let avatar: any = chen
  export let size: 16 | 24 | 32 | 34 | 36 | 88 = 24
</script>

<div class="avatar-container" style="width: {size}px; height: {size}px;">
  <img style="width: {size}px; height: {size}px;" src={avatar} alt={''}/>
</div>

<style lang="scss">
  .avatar-container {
    overflow: hidden;
    border: 50%;
    pointer-events: none;
  }
</style>