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
  export let size: 'small' | 'medium' | 'large'
  export let fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M5.79336 4.36074C6.18388 3.97021 6.81704 3.97021 7.20757 4.36074L10.8803 8.03392L7.20711 11.7071C6.81658 12.0976 6.18342 12.0976 5.79289 11.7071C5.40237 11.3166 5.40237 10.6834 5.79289 10.2929L8.05186 8.03392L5.79336 5.77495C5.40283 5.38443 5.40283 4.75126 5.79336 4.36074Z"
  />
</svg>
