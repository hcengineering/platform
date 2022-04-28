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
<script type="ts">
  import Spinner from './Spinner.svelte'
</script>

<div class="spinner-container"><div class="inner"><Spinner /></div></div>

<style lang="scss">
  .spinner-container {
    display: flex;
    height: 100%;
  }

  @keyframes makeVisible {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .spinner-container .inner {
    margin: auto;
    opacity: 0;
    animation-name: makeVisible;
    animation-duration: 0.25s;
    animation-delay: 0.1s;
    animation-fill-mode: forwards;
  }
</style>
