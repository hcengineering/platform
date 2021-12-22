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
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path d="M4,13.2c-0.3,0-0.5-0.2-0.5-0.5V3.8c0-0.3,0-0.6,0.2-0.8s0.5-0.2,0.8-0.2h6.3c0.6,0,1.1,0,1.3,0.5c0.2,0.5-0.1,0.8-0.6,1.2 L9.4,6.7l2.1,2.1c0.5,0.5,0.8,0.8,0.6,1.2c-0.2,0.5-0.7,0.5-1.3,0.5H4.5v2.2C4.5,12.9,4.3,13.2,4,13.2z M4.5,9.5h6.3L8.6,7.3 C8.4,7.1,8.2,7,8.2,6.7c0-0.3,0.2-0.5,0.3-0.6l2.2-2.2H4.5V9.5z"/>
</svg>
