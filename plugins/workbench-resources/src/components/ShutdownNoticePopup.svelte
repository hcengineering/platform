<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { Button, Label } from '@hcengineering/ui'
  import workbench from '../plugin'
  import { communityLink, migrationContactEmail } from '../utils'

  const dispatch = createEventDispatcher()

  function handleJoinCommunity (): void {
    dispatch('close')
    window.open(communityLink, '_blank', 'noopener,noreferrer')
  }
</script>

<div class="shutdown-notice-popup">
  <div class="header warning">
    <div class="title">
      <Label label={workbench.string.ShutdownWarningTitle} />
    </div>
  </div>

  <div class="body">
    <div class="hint">
      <Label label={workbench.string.ShutdownWarningHint} />
    </div>

    <div class="hint">
      <Label label={workbench.string.ShutdownNextEventBefore} /><b
        ><Label label={workbench.string.ShutdownNextEventDate} /></b
      ><Label label={workbench.string.ShutdownNextEventAfter} />
    </div>

    <div class="hint">
      <Label label={workbench.string.ShutdownCommunityHint} />
    </div>

    <div class="hint">
      <Label label={workbench.string.ShutdownContactPrefix} /><a href="mailto:{migrationContactEmail}"
        >{migrationContactEmail}</a
      >
    </div>

    <div class="footer">
      <Button kind="primary" size="medium" label={workbench.string.JoinCommunityCta} on:click={handleJoinCommunity} />
    </div>
  </div>
</div>

<style lang="scss">
  .shutdown-notice-popup {
    display: flex;
    flex-direction: column;
    min-width: 20rem;
    max-width: 26rem;
    background: var(--theme-popup-color);
    border: 1px solid var(--theme-popup-divider);
    border-radius: var(--small-BorderRadius);
    box-shadow: var(--theme-popup-shadow);
    overflow: hidden;

    .header {
      padding: 0.625rem 0.875rem;
      border-bottom: 1px solid var(--theme-popup-divider);

      .title {
        font-weight: 600;
        color: var(--theme-caption-color);
      }

      &.warning {
        background: var(--theme-warning-color, var(--theme-popup-hover));
        .title {
          color: var(--theme-on-warning-color, var(--theme-caption-color));
        }
      }
    }

    .body {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 0.875rem;
    }

    .hint {
      color: var(--theme-content-color);
      font-size: 0.8125rem;
      line-height: 1.4;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
    }
  }
</style>
