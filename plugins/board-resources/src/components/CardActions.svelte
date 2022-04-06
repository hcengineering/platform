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
  import type { Card } from '@anticrm/board'
  import { Button, IconAttachment, Label } from '@anticrm/ui'
  import board from '../plugin'

  export let value: Card
</script>

{#if value}
  <div class="root">
    <div class="section">
      <Label label={board.string.AddToCard} />
      <Button icon={board.icon.Card} label={board.string.Members} kind="no-border" justify={'left'} width={'100%'} />
      <Button icon={board.icon.Card} label={board.string.Labels} kind="no-border" justify={'left'} width={'100%'} />
      <Button icon={board.icon.Card} label={board.string.Checklist} kind="no-border" justify={'left'} width={'100%'} />
      <Button icon={board.icon.Card} label={board.string.Dates} kind="no-border" justify={'left'} width={'100%'} />
      <Button icon={IconAttachment} label={board.string.Attachments} kind="no-border" justify={'left'} width={'100%'} />
      <Button
        icon={board.icon.Card}
        label={board.string.CustomFields}
        kind="no-border"
        justify={'left'}
        width={'100%'}
      />
    </div>
    <div>
      <Label label={board.string.Automation} />
      <Button
        icon={board.icon.Plus}
        label={board.string.AddButton}
        kind="transparent"
        justify={'left'}
        width={'100%'}
      />
    </div>
    <div class="section">
      <Label label={board.string.Actions} />
      <Button icon={board.icon.Card} label={board.string.Move} kind="no-border" justify={'left'} width={'100%'} />
      <Button icon={board.icon.Card} label={board.string.Copy} kind="no-border" justify={'left'} width={'100%'} />
      <Button
        icon={board.icon.Card}
        label={board.string.MakeTemplate}
        kind="no-border"
        justify={'left'}
        width={'100%'}
      />
      <Button icon={board.icon.Card} label={board.string.Watch} kind="no-border" justify={'left'} width={'100%'} />
      <Button icon={board.icon.Card} label={board.string.Archive} kind="no-border" justify={'left'} width={'100%'} />
    </div>
  </div>
{/if}

<style lang="scss">
  .root {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
  }
  .section {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
</style>
