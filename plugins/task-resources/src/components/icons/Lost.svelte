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
  <path d="M8,1.5C4.4,1.5,1.5,4.4,1.5,8s2.9,6.5,6.5,6.5s6.5-2.9,6.5-6.5S11.6,1.5,8,1.5z M2.5,8c0-1.3,0.5-2.6,1.3-3.5l7.7,7.7 c-1,0.8-2.2,1.3-3.5,1.3C5,13.5,2.5,11,2.5,8z M12.2,11.5L4.5,3.8C5.4,3,6.7,2.5,8,2.5c3,0,5.5,2.5,5.5,5.5 C13.5,9.3,13,10.6,12.2,11.5z"/>
</svg>
