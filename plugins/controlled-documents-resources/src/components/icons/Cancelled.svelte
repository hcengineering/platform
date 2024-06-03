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
    d="M10 1.25C5.125 1.25 1.25 5.125 1.25 10C1.25 14.875 5.125 18.75 10 18.75C14.875 18.75 18.75 14.875 18.75 10C18.75 5.125 14.875 1.25 10 1.25ZM10 17.5C5.875 17.5 2.5 14.125 2.5 10C2.5 5.875 5.875 2.5 10 2.5C14.125 2.5 17.5 5.875 17.5 10C17.5 14.125 14.125 17.5 10 17.5Z"
    fill="black"
    fill-opacity="0.4"
  />
  <path
    d="M5.80806 5.80821C5.56398 6.05229 5.56398 6.44802 5.80806 6.69209L9.11612 10.0002L5.80806 13.3082C5.56398 13.5523 5.56398 13.948 5.80806 14.1921C6.05214 14.4362 6.44786 14.4362 6.69194 14.1921L10 10.884L13.3081 14.1921C13.5521 14.4362 13.9479 14.4362 14.1919 14.1921C14.436 13.948 14.436 13.5523 14.1919 13.3082L10.8839 10.0002L14.1919 6.69209C14.436 6.44802 14.436 6.05229 14.1919 5.80821C13.9479 5.56413 13.5521 5.56413 13.3081 5.80821L10 9.11627L6.69194 5.80821C6.44786 5.56413 6.05214 5.56413 5.80806 5.80821Z"
    fill="black"
    fill-opacity="0.4"
  />
</svg>
