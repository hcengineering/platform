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
  import { getResource } from '@anticrm/platform'
  import type { AnyComponent } from '../types'
  
  // import Icon from './Icon.svelte'
  import Spinner from './Spinner.svelte'
  import ErrorBoundary from './internal/ErrorBoundary'

  export let is: AnyComponent
  export let props = {}

  $: component = getResource(is)
</script>

{#await component}
  <div class="spinner-container"><div class="inner"><Spinner /></div></div>
{:then Ctor}
  <ErrorBoundary>
    <Ctor {...props} on:change on:close on:open on:click/>
  </ErrorBoundary>
{:catch err}
  ERROR: {console.log(err, JSON.stringify(component))}
  {props}
  {err}
  <!-- <Icon icon={ui.icon.Error} size="32" /> -->
{/await}

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
}

</style>
