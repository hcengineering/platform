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
  export let size: 'small' | 'medium' | 'large' = 'medium'
</script>

<div
  class="square-spinner-container {size === 'small' ? 'size-small' : size === 'medium' ? 'size-medium' : 'size-large'}"
>
  <div class="loader"></div>
</div>

<style lang="scss">
  .square-spinner-container {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.1875rem;
    height: 2.1875rem;
  }

  .size-small {
    width: 1.75rem;
    height: 1.75rem;
  }

  .size-large {
    width: 3.5rem;
    height: 3.5rem;
  }

  .loader {
    height: 0.3125rem;
    width: 0.3125rem;
    color: var(--theme-trans-color);
    box-shadow:
      -0.625rem -0.625rem 0 0.3125rem,
      -0.625rem -0.625rem 0 0.3125rem,
      -0.625rem -0.625rem 0 0.3125rem,
      -0.625rem -0.625rem 0 0.3125rem;
    animation: squareSpinner 6s infinite;
  }

  /* Size variations */
  .size-small .loader {
    height: 0.25rem;
    width: 0.25rem;
    box-shadow:
      -0.5rem -0.5rem 0 0.25rem,
      -0.5rem -0.5rem 0 0.25rem,
      -0.5rem -0.5rem 0 0.25rem,
      -0.5rem -0.5rem 0 0.25rem;
  }

  .size-large .loader {
    height: 0.5rem;
    width: 0.5rem;
    box-shadow:
      -1rem -1rem 0 0.5rem,
      -1rem -1rem 0 0.5rem,
      -1rem -1rem 0 0.5rem,
      -1rem -1rem 0 0.5rem;
  }

  @keyframes squareSpinner {
    0% {
      box-shadow:
        -0.625rem -0.625rem 0 0.3125rem,
        -0.625rem -0.625rem 0 0.3125rem,
        -0.625rem -0.625rem 0 0.3125rem,
        -0.625rem -0.625rem 0 0.3125rem;
    }
    8.33% {
      box-shadow:
        -0.625rem -0.625rem 0 0.3125rem,
        0.625rem -0.625rem 0 0.3125rem,
        0.625rem -0.625rem 0 0.3125rem,
        0.625rem -0.625rem 0 0.3125rem;
    }
    16.66% {
      box-shadow:
        -0.625rem -0.625rem 0 0.3125rem,
        0.625rem -0.625rem 0 0.3125rem,
        0.625rem 0.625rem 0 0.3125rem,
        0.625rem 0.625rem 0 0.3125rem;
    }
    24.99% {
      box-shadow:
        -0.625rem -0.625rem 0 0.3125rem,
        0.625rem -0.625rem 0 0.3125rem,
        0.625rem 0.625rem 0 0.3125rem,
        -0.625rem 0.625rem 0 0.3125rem;
    }
    33.32% {
      box-shadow:
        -0.625rem -0.625rem 0 0.3125rem,
        0.625rem -0.625rem 0 0.3125rem,
        0.625rem 0.625rem 0 0.3125rem,
        -0.625rem -0.625rem 0 0.3125rem;
    }
    41.65% {
      box-shadow:
        0.625rem -0.625rem 0 0.3125rem,
        0.625rem -0.625rem 0 0.3125rem,
        0.625rem 0.625rem 0 0.3125rem,
        0.625rem -0.625rem 0 0.3125rem;
    }
    49.98% {
      box-shadow:
        0.625rem 0.625rem 0 0.3125rem,
        0.625rem 0.625rem 0 0.3125rem,
        0.625rem 0.625rem 0 0.3125rem,
        0.625rem 0.625rem 0 0.3125rem;
    }
    58.31% {
      box-shadow:
        -0.625rem 0.625rem 0 0.3125rem,
        -0.625rem 0.625rem 0 0.3125rem,
        0.625rem 0.625rem 0 0.3125rem,
        -0.625rem 0.625rem 0 0.3125rem;
    }
    66.64% {
      box-shadow:
        -0.625rem -0.625rem 0 0.3125rem,
        -0.625rem -0.625rem 0 0.3125rem,
        0.625rem 0.625rem 0 0.3125rem,
        -0.625rem 0.625rem 0 0.3125rem;
    }
    74.97% {
      box-shadow:
        -0.625rem -0.625rem 0 0.3125rem,
        0.625rem -0.625rem 0 0.3125rem,
        0.625rem 0.625rem 0 0.3125rem,
        -0.625rem 0.625rem 0 0.3125rem;
    }
    83.3% {
      box-shadow:
        -0.625rem -0.625rem 0 0.3125rem,
        0.625rem 0.625rem 0 0.3125rem,
        0.625rem 0.625rem 0 0.3125rem,
        -0.625rem 0.625rem 0 0.3125rem;
    }
    91.63% {
      box-shadow:
        -0.625rem -0.625rem 0 0.3125rem,
        -0.625rem 0.625rem 0 0.3125rem,
        -0.625rem 0.625rem 0 0.3125rem,
        -0.625rem 0.625rem 0 0.3125rem;
    }
    100% {
      box-shadow:
        -0.625rem -0.625rem 0 0.3125rem,
        -0.625rem -0.625rem 0 0.3125rem,
        -0.625rem -0.625rem 0 0.3125rem,
        -0.625rem -0.625rem 0 0.3125rem;
    }
  }

  /* Size-specific animations */
  .size-small .loader {
    animation: squareSpinnerSmall 6s infinite;
  }

  .size-large .loader {
    animation: squareSpinnerLarge 6s infinite;
  }

  @keyframes squareSpinnerSmall {
    0% {
      box-shadow:
        -0.5rem -0.5rem 0 0.25rem,
        -0.5rem -0.5rem 0 0.25rem,
        -0.5rem -0.5rem 0 0.25rem,
        -0.5rem -0.5rem 0 0.25rem;
    }
    8.33% {
      box-shadow:
        -0.5rem -0.5rem 0 0.25rem,
        0.5rem -0.5rem 0 0.25rem,
        0.5rem -0.5rem 0 0.25rem,
        0.5rem -0.5rem 0 0.25rem;
    }
    16.66% {
      box-shadow:
        -0.5rem -0.5rem 0 0.25rem,
        0.5rem -0.5rem 0 0.25rem,
        0.5rem 0.5rem 0 0.25rem,
        0.5rem 0.5rem 0 0.25rem;
    }
    24.99% {
      box-shadow:
        -0.5rem -0.5rem 0 0.25rem,
        0.5rem -0.5rem 0 0.25rem,
        0.5rem 0.5rem 0 0.25rem,
        -0.5rem 0.5rem 0 0.25rem;
    }
    33.32% {
      box-shadow:
        -0.5rem -0.5rem 0 0.25rem,
        0.5rem -0.5rem 0 0.25rem,
        0.5rem 0.5rem 0 0.25rem,
        -0.5rem -0.5rem 0 0.25rem;
    }
    41.65% {
      box-shadow:
        0.5rem -0.5rem 0 0.25rem,
        0.5rem -0.5rem 0 0.25rem,
        0.5rem 0.5rem 0 0.25rem,
        0.5rem -0.5rem 0 0.25rem;
    }
    49.98% {
      box-shadow:
        0.5rem 0.5rem 0 0.25rem,
        0.5rem 0.5rem 0 0.25rem,
        0.5rem 0.5rem 0 0.25rem,
        0.5rem 0.5rem 0 0.25rem;
    }
    58.31% {
      box-shadow:
        -0.5rem 0.5rem 0 0.25rem,
        -0.5rem 0.5rem 0 0.25rem,
        0.5rem 0.5rem 0 0.25rem,
        -0.5rem 0.5rem 0 0.25rem;
    }
    66.64% {
      box-shadow:
        -0.5rem -0.5rem 0 0.25rem,
        -0.5rem -0.5rem 0 0.25rem,
        0.5rem 0.5rem 0 0.25rem,
        -0.5rem 0.5rem 0 0.25rem;
    }
    74.97% {
      box-shadow:
        -0.5rem -0.5rem 0 0.25rem,
        0.5rem -0.5rem 0 0.25rem,
        0.5rem 0.5rem 0 0.25rem,
        -0.5rem 0.5rem 0 0.25rem;
    }
    83.3% {
      box-shadow:
        -0.5rem -0.5rem 0 0.25rem,
        0.5rem 0.5rem 0 0.25rem,
        0.5rem 0.5rem 0 0.25rem,
        -0.5rem 0.5rem 0 0.25rem;
    }
    91.63% {
      box-shadow:
        -0.5rem -0.5rem 0 0.25rem,
        -0.5rem 0.5rem 0 0.25rem,
        -0.5rem 0.5rem 0 0.25rem,
        -0.5rem 0.5rem 0 0.25rem;
    }
    100% {
      box-shadow:
        -0.5rem -0.5rem 0 0.25rem,
        -0.5rem -0.5rem 0 0.25rem,
        -0.5rem -0.5rem 0 0.25rem,
        -0.5rem -0.5rem 0 0.25rem;
    }
  }

  @keyframes squareSpinnerLarge {
    0% {
      box-shadow:
        -1rem -1rem 0 0.5rem,
        -1rem -1rem 0 0.5rem,
        -1rem -1rem 0 0.5rem,
        -1rem -1rem 0 0.5rem;
    }
    8.33% {
      box-shadow:
        -1rem -1rem 0 0.5rem,
        1rem -1rem 0 0.5rem,
        1rem -1rem 0 0.5rem,
        1rem -1rem 0 0.5rem;
    }
    16.66% {
      box-shadow:
        -1rem -1rem 0 0.5rem,
        1rem -1rem 0 0.5rem,
        1rem 1rem 0 0.5rem,
        1rem 1rem 0 0.5rem;
    }
    24.99% {
      box-shadow:
        -1rem -1rem 0 0.5rem,
        1rem -1rem 0 0.5rem,
        1rem 1rem 0 0.5rem,
        -1rem 1rem 0 0.5rem;
    }
    33.32% {
      box-shadow:
        -1rem -1rem 0 0.5rem,
        1rem -1rem 0 0.5rem,
        1rem 1rem 0 0.5rem,
        -1rem -1rem 0 0.5rem;
    }
    41.65% {
      box-shadow:
        1rem -1rem 0 0.5rem,
        1rem -1rem 0 0.5rem,
        1rem 1rem 0 0.5rem,
        1rem -1rem 0 0.5rem;
    }
    49.98% {
      box-shadow:
        1rem 1rem 0 0.5rem,
        1rem 1rem 0 0.5rem,
        1rem 1rem 0 0.5rem,
        1rem 1rem 0 0.5rem;
    }
    58.31% {
      box-shadow:
        -1rem 1rem 0 0.5rem,
        -1rem 1rem 0 0.5rem,
        1rem 1rem 0 0.5rem,
        -1rem 1rem 0 0.5rem;
    }
    66.64% {
      box-shadow:
        -1rem -1rem 0 0.5rem,
        -1rem -1rem 0 0.5rem,
        1rem 1rem 0 0.5rem,
        -1rem 1rem 0 0.5rem;
    }
    74.97% {
      box-shadow:
        -1rem -1rem 0 0.5rem,
        1rem -1rem 0 0.5rem,
        1rem 1rem 0 0.5rem,
        -1rem 1rem 0 0.5rem;
    }
    83.3% {
      box-shadow:
        -1rem -1rem 0 0.5rem,
        1rem 1rem 0 0.5rem,
        1rem 1rem 0 0.5rem,
        -1rem 1rem 0 0.5rem;
    }
    91.63% {
      box-shadow:
        -1rem -1rem 0 0.5rem,
        -1rem 1rem 0 0.5rem,
        -1rem 1rem 0 0.5rem,
        -1rem 1rem 0 0.5rem;
    }
    100% {
      box-shadow:
        -1rem -1rem 0 0.5rem,
        -1rem -1rem 0 0.5rem,
        -1rem -1rem 0 0.5rem,
        -1rem -1rem 0 0.5rem;
    }
  }
</style>
