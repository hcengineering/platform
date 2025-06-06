<script lang="ts">
  // TODO: Refactor to use State component from 'StateTag'

  import { DocumentStateTagType } from '../../../utils'

  export let type: DocumentStateTagType
</script>

<div class="root {type}">
  <span class="label"><slot /></span>
</div>

<style lang="scss">
  .root {
    padding: 0.125rem 0.5rem;
    display: flex;
    border-radius: 0.25rem;
    border: 1px solid var(--theme-docs-contrast-color);
    width: max-content;

    &.inProgress {
      background: var(--theme-state-primary-background-color);
      border-color: var(--theme-state-primary-border-color);

      .label {
        color: var(--theme-state-primary-color);
      }
    }

    &.draft {
      background: var(--theme-state-regular-background-color);
      border-color: var(--theme-state-regular-border-color);

      .label {
        color: var(--theme-state-regular-color);
      }
    }

    &.obsolete {
      background: var(--theme-state-negative-background-color);
      border-color: var(--theme-state-negative-border-color);

      .label {
        color: var(--theme-state-negative-color);
      }
    }

    &.effective {
      background: var(--theme-state-positive-background-color);
      border-color: var(--theme-state-positive-border-color);

      .label {
        color: var(--theme-state-positive-color);
      }
    }

    &.rejected {
      background: var(--theme-state-negative-background-color);
      border-color: var(--theme-state-negative-border-color);

      .label {
        color: var(--theme-state-negative-color);
      }
    }
  }

  .label {
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1rem;
  }
</style>
