<!--
//
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
//
-->
<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M29.9,4.1c-0.1-0.4-0.4-0.8-0.7-1.1c-0.3-0.3-0.7-0.5-1.1-0.7c-0.1,0-0.2-0.1-0.3-0.1H4.2c-0.1,0-0.2,0-0.3,0.1C3.5,2.5,3.1,2.7,2.8,3C2.5,3.3,2.3,3.7,2.1,4.1C2,4.5,2,5,2,5.4c0.1,0.4,0.2,0.8,0.5,1.2c0,0,0.1,0.1,0.1,0.1l8.8,9.7v6.9c0,0.3,0.1,0.6,0.4,0.8l7.3,5.4c0.2,0.1,0.4,0.2,0.6,0.2c0.2,0,0.3,0,0.4-0.1c0.3-0.2,0.6-0.5,0.6-0.9V16.4l8.8-9.7c0,0,0.1-0.1,0.1-0.1c0.2-0.4,0.4-0.8,0.5-1.2C30,5,30,4.5,29.9,4.1z M27.9,5.4l-9,9.9c-0.2,0.2-0.3,0.4-0.3,0.7v10.7l-5.3-3.9V16c0-0.2-0.1-0.5-0.3-0.7l-9-9.9C4.1,5.3,4,5.2,4,5.1C4,5,4,4.9,4,4.8c0-0.1,0.1-0.2,0.2-0.3c0.1-0.1,0.1-0.1,0.2-0.1h23.2c0.1,0,0.1,0.1,0.2,0.1c0.1,0.1,0.2,0.2,0.2,0.3C28,4.9,28,5,28,5.1C28,5.2,27.9,5.3,27.9,5.4z"
  />
</svg>
