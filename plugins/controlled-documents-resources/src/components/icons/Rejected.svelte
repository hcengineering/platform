<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  export let fill: string = 'currentColor'
  export let size: 'small' | 'medium' | 'large' = 'small'
</script>

<svg class="svg-{size}" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" {fill}>
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M1.25 10C1.25 5.125 5.125 1.25 10 1.25C14.875 1.25 18.75 5.125 18.75 10C18.75 14.875 14.875 18.75 10 18.75C5.125 18.75 1.25 14.875 1.25 10ZM5.80806 6.69209C5.56398 6.44802 5.56398 6.05229 5.80806 5.80821C6.05214 5.56413 6.44786 5.56413 6.69194 5.80821L10 9.11627L13.3081 5.80821C13.5521 5.56413 13.9479 5.56413 14.1919 5.80821C14.436 6.05229 14.436 6.44802 14.1919 6.69209L10.8839 10.0002L14.1919 13.3082C14.436 13.5523 14.436 13.948 14.1919 14.1921C13.9479 14.4362 13.5521 14.4362 13.3081 14.1921L10 10.884L6.69194 14.1921C6.44786 14.4362 6.05214 14.4362 5.80806 14.1921C5.56398 13.948 5.56398 13.5523 5.80806 13.3082L9.11612 10.0002L5.80806 6.69209Z"
    fill="#CA4242"
  />
</svg>
