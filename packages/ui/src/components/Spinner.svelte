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
  export let size: 'small' | 'medium' = 'medium'
</script>

<div class="spinner spinner-{size}">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <linearGradient id="a" gradientUnits="userSpaceOnUse" x1="0" y1="22" x2="0" y2="2">
      <stop offset="0" stop-color={'var(--theme-caption-color)'} />
      <stop offset="1" stop-color={'var(--theme-caption-color)'} stop-opacity="0" />
    </linearGradient>
    <path d="M12 0v1c6.1 0 11 4.9 11 11s-4.9 11-11 11v1c6.6 0 12-5.4 12-12S18.6 0 12 0z" fill="url(#a)" />
    <path d="M12 23C5.9 23 1 18.1 1 12S5.9 1 12 1V0C5.4 0 0 5.4 0 12s5.4 12 12 12v-1z" fill="#fff" />
  </svg>
</div>

<style lang="scss">
  .spinner {
    -webkit-animation: spinCircle 1s infinite linear;
    animation: spinCircle 1s infinite linear;

    &-small {
      width: 1rem;
      height: 1rem;
    }
    &-medium {
      width: 1.5rem;
      height: 1.5rem;
    }
  }
  @-webkit-keyframes spinCircle {
    from {
      -webkit-transform: rotate(0deg);
    }
    to {
      -webkit-transform: rotate(359deg);
    }
  }
  @keyframes spinCircle {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(359deg);
    }
  }
</style>
