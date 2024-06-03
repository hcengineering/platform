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
  import { Label } from '@hcengineering/ui'
  import plugin from '../../plugin'

  export let templateReference: string

  const rootStyle = /* css */ `
    width: 100%;
    font-family: 'IBM Plex Sans';
    font-size: 6pt;
    display: flex;
    align-items: center;
    gap: 1cm;
    margin: 0 9.5mm;
  `

  const metaStyle = /* css */ `
    flex: 0 0 auto;
    font-size: 7pt;
  `

  // Note: cannot use standard puppeteer "date" class as format cannot be easily adjusted for it
  const dtf = new Intl.DateTimeFormat('default', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    timeZoneName: 'short'
  })
</script>

<footer style={rootStyle}>
  <div style:flex="1 1 0">
    {#if templateReference !== ''}
      <Label label={plugin.string.CreatedFromTemplate} />
      <span>{templateReference}</span>
    {/if}
  </div>
  <div style={metaStyle}>
    {dtf.format(new Date())}
  </div>
  <div style={metaStyle}>
    <Label label={plugin.string.Page} />
    <span class="pageNumber" />
    <Label label={plugin.string.Of} />
    <span class="totalPages" />
  </div>
</footer>
