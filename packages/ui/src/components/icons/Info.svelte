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
  export let size: 'tiny' | 'small' | 'medium' | 'large'
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M8,1C4.1,1,1,4.1,1,8c0,3.9,3.1,7,7,7c3.9,0,7-3.1,7-7C15,4.1,11.9,1,8,1z M8,13.8c-3.2,0-5.8-2.6-5.8-5.8 S4.8,2.2,8,2.2s5.8,2.6,5.8,5.8S11.2,13.8,8,13.8z"
  />
  <polygon points="7.5,9.7 8.6,9.7 8.7,3.6 7.3,3.6 7.5,9.5 " />
  <circle cx="8" cy="11.1" r="0.9" />
</svg>
