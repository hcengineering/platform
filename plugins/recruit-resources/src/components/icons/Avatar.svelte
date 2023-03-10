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
  const fill: string = 'var(--caption-color)'
</script>

<svg class="svg-avatar" {fill} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <circle class="op" cx="20" cy="13.6" r="6.4" />
  <path
    d="M33.1,33.3c-0.8-2.2-2.5-4.2-4.9-5.5c-2.3-1.3-5.2-2.1-8.2-2.1s-5.8,0.7-8.2,2.1c-2.4,1.4-4.1,3.3-4.9,5.5 c-0.1,0.4,0.1,0.8,0.5,1c0.4,0.1,0.8-0.1,1-0.5c0.7-1.9,2.2-3.5,4.2-4.7c2.1-1.2,4.7-1.9,7.4-1.9c2.7,0,5.3,0.7,7.4,1.9 c2.1,1.2,3.6,2.9,4.2,4.7c0.1,0.3,0.4,0.5,0.7,0.5c0.1,0,0.2,0,0.3,0C33,34.1,33.2,33.7,33.1,33.3z"
  />
  <path
    d="M20,20.8c3.9,0,7.1-3.2,7.1-7.1S23.9,6.5,20,6.5c-3.9,0-7.1,3.2-7.1,7.1S16.1,20.8,20,20.8z M20,8 c3.1,0,5.6,2.5,5.6,5.6s-2.5,5.6-5.6,5.6c-3.1,0-5.6-2.5-5.6-5.6S16.9,8,20,8z"
  />
</svg>

<style lang="scss">
  .svg-avatar {
    width: 2.5rem;
    height: 2.5rem;
    fill: var(--caption-color);
    .op {
      opacity: 0.05;
    }
  }
</style>
