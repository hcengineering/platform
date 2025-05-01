<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
    d="M10.8332 7.99996C10.8332 6.43515 9.56464 5.16663 7.99984 5.16663C6.43503 5.16663 5.1665 6.43515 5.1665 7.99996C5.1665 9.56477 6.43503 10.8333 7.99984 10.8333C9.56464 10.8333 10.8332 9.56477 10.8332 7.99996ZM11.8332 7.99996C11.8332 10.1171 10.1169 11.8333 7.99984 11.8333C5.88275 11.8333 4.1665 10.1171 4.1665 7.99996C4.1665 5.88287 5.88275 4.16663 7.99984 4.16663C10.1169 4.16663 11.8332 5.88287 11.8332 7.99996Z"
  />
</svg>
