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
  export let size: 'x-small' | 'small' | 'medium' | 'large' | 'x-large'
</script>

<div class="{size} container">
  <img class={size} src={avatar} alt={''}/>
</div>

<style lang="scss">
  .x-small {
    width: 1.5rem;
    height: 1.5rem;
  }
  .small {
    width: 2rem;
    height: 2rem;
  }
  .medium {
    width: 2.25rem;
    height: 2.25rem;
  }
  .large {
    width: 5rem;
    height: 5rem;
  }
  .x-large {
    width: 10rem;
    height: 10rem;
  }
  .container {
    overflow: hidden;
    border: 50%;
    pointer-events: none;
  }
</style>