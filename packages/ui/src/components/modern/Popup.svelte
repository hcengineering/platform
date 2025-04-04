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
</script>

  <div class="user-popup">
    <div class="content">
      <slot name="content" />
    </div>

    <div class="action-container">
      <slot name="actions">
      </slot>
    </div>
  </div>

<style lang="scss">
  .user-popup {
    box-sizing: border-box;
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 0;
    width: 360px;
    background: #F1F1F1;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 24px;
    box-shadow: 0px 100px 80px rgba(0, 0, 0, 0.15),
                0px 40px 32px rgba(0, 0, 0, 0.12),
                0px 24px 16px rgba(0, 0, 0, 0.1),
                0px 12px 12px rgba(0, 0, 0, 0.1),
                0px 6px 6px rgba(0, 0, 0, 0.08),
                0px 2px 2px rgba(0, 0, 0, 0.05);

    // Common flex container styles
    .content,
    .action-container {
      width: 360px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      flex: none;
      align-self: stretch;
      flex-grow: 0;
    }

    .content {
      height: 224px;
      padding: 0;
      isolation: isolate;
      order: 0;

      .image-container {
        width: 360px;
        height: 120px;
        margin: -56px 0;
        z-index: 0;
      }

      .main-container {
        padding: 16px 0;
        gap: 16px;
        height: 160px;
        z-index: 1;
      }

      .button {
        position: absolute;
        width: 28px;
        height: 28px;
        right: 16px;
        top: 16px;
        border-radius: 6px;
        z-index: 2;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    }

    .action-container {
      height: 72px;
      padding: 16px;
      gap: 12px;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      order: 1;
    }
  }
</style>
