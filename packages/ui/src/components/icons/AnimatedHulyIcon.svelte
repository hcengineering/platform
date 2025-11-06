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

<div class="huly-loading {size === 'small' ? 'size-small' : size === 'medium' ? 'size-medium' : 'size-large'}">
  <!-- Background glows -->
  <div class="glow-bottom-left"></div>
  <div class="glow-top-right"></div>

  <!-- Animated Huly icon -->
  <svg class="huly-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 62 62">
    <g clip-path="url(#huly-loading_svg__a)">
      <rect width="62" height="62" fill="#090A0C" rx="15" />
      <rect
        width="60.5"
        height="60.5"
        x=".75"
        y=".75"
        stroke="#91AAFF"
        stroke-opacity=".17"
        stroke-width="1.5"
        rx="14.25"
      />

      <mask
        id="huly-loading_svg__b"
        width="61"
        height="59"
        x="0"
        y="0"
        maskUnits="userSpaceOnUse"
        style="mask-type:alpha"
      >
        <path
          fill="#D9D9D9"
          fill-rule="evenodd"
          d="M60.34 15.998c0 6.533-4.036 12.123-9.75 14.413a15.5 15.5 0 0 1 5.9 12.18c0 8.573-6.95 15.522-15.521 15.522-8.573 0-15.522-6.95-15.522-15.521 0-6.533 4.036-12.123 9.75-14.413a15.57 15.57 0 0 1-4.687-6.154c-2.224 5.848-7.883 10.004-14.512 10.004C7.426 32.03.477 25.08.477 16.508S7.426.986 15.997.986c6.436 0 11.956 3.916 14.309 9.495C32.53 4.633 38.189.477 44.818.477c8.573 0 15.522 6.949 15.522 15.52Z"
          clip-rule="evenodd"
        />
      </mask>

      <g mask="url(#huly-loading_svg__b)">
        <g filter="url(#huly-loading_svg__c)">
          <path
            class="icon-shadow"
            fill="#000"
            d="M46.428 36.828a2.4 2.4 0 0 1 2.4 2.4v7.2a2.4 2.4 0 0 1-2.4 2.4h-7.2a2.4 2.4 0 0 1-2.4-2.4v-7.2a2.4 2.4 0 0 1 2.4-2.4zm-24-24a2.4 2.4 0 0 1 2.4 2.4v7.2a2.4 2.4 0 0 1-2.4 2.4h-7.2a2.4 2.4 0 0 1-2.4-2.4v-7.2a2.4 2.4 0 0 1 2.4-2.4zm25.697 12.703a2.4 2.4 0 0 0 .703-1.697v-8.606a2.4 2.4 0 0 0-2.4-2.4h-7.2a2.4 2.4 0 0 0-2.4 2.4v7.2a2.4 2.4 0 0 1-2.4 2.4h-8.606a2.4 2.4 0 0 0-1.697.703L13.531 36.125a2.4 2.4 0 0 0-.703 1.697v8.606a2.4 2.4 0 0 0 2.4 2.4h7.2a2.4 2.4 0 0 0 2.4-2.4v-7.2a2.4 2.4 0 0 1 2.4-2.4h8.606a2.4 2.4 0 0 0 1.697-.703z"
          />
        </g>
      </g>

      <path
        class="icon-main top-left-block"
        fill="#D5D5D5"
        d="M22.428 12.828a2.4 2.4 0 0 1 2.4 2.4v7.2a2.4 2.4 0 0 1-2.4 2.4h-7.2a2.4 2.4 0 0 1-2.4-2.4v-7.2a2.4 2.4 0 0 1 2.4-2.4z"
      />

      <path
        class="icon-main center-connector"
        fill="#D5D5D5"
        d="M48.002 25.531a2.4 2.4 0 0 0 .703-1.697v-8.606a2.4 2.4 0 0 0-2.4-2.4h-7.2a2.4 2.4 0 0 0-2.4 2.4v7.2a2.4 2.4 0 0 1-2.4 2.4H25.7a2.4 2.4 0 0 0-1.697.703L13.408 36.125a2.4 2.4 0 0 0-.703 1.697v8.606a2.4 2.4 0 0 0 2.4 2.4h7.2a2.4 2.4 0 0 0 2.4-2.4v-7.2a2.4 2.4 0 0 1 2.4-2.4h8.606a2.4 2.4 0 0 0 1.697-.703z"
      />

      <path
        class="icon-main bottom-right-block"
        fill="#D5D5D5"
        d="M46.305 36.828a2.4 2.4 0 0 1 2.4 2.4v7.2a2.4 2.4 0 0 1-2.4 2.4h-7.2a2.4 2.4 0 0 1-2.4-2.4v-7.2a2.4 2.4 0 0 1 2.4-2.4z"
      />

      <path
        class="icon-stroke"
        stroke="#fff"
        stroke-width=".342"
        d="M46.428 37a2.23 2.23 0 0 1 2.23 2.228v7.2a2.23 2.23 0 0 1-2.23 2.23h-7.2A2.23 2.23 0 0 1 37 46.427v-7.2a2.23 2.23 0 0 1 2.23-2.229h7.2Zm-24-24a2.23 2.23 0 0 1 2.23 2.228v7.2a2.23 2.23 0 0 1-2.23 2.23h-7.2A2.23 2.23 0 0 1 13 22.427v-7.2a2.23 2.23 0 0 1 2.23-2.229h7.2Zm26.23 10.834a2.23 2.23 0 0 1-.654 1.576L37.41 36.004a2.23 2.23 0 0 1-1.576.653h-8.606a2.57 2.57 0 0 0-2.57 2.571v7.2a2.23 2.23 0 0 1-2.23 2.23h-7.2A2.23 2.23 0 0 1 13 46.427v-8.606c0-.59.235-1.158.653-1.576l10.594-10.594a2.23 2.23 0 0 1 1.576-.653h8.606A2.57 2.57 0 0 0 37 22.43v-7.2A2.23 2.23 0 0 1 39.23 13h7.2a2.23 2.23 0 0 1 2.228 2.23v8.605Z"
        opacity=".8"
      />

      <mask
        id="huly-loading_svg__f"
        width="37"
        height="37"
        x="12"
        y="12"
        maskUnits="userSpaceOnUse"
        style="mask-type:alpha"
      >
        <path
          fill="#D9D9D9"
          d="M46.428 36.828a2.4 2.4 0 0 1 2.4 2.4v7.2a2.4 2.4 0 0 1-2.4 2.4h-7.2a2.4 2.4 0 0 1-2.4-2.4v-7.2a2.4 2.4 0 0 1 2.4-2.4zm-24-24a2.4 2.4 0 0 1 2.4 2.4v7.2a2.4 2.4 0 0 1-2.4 2.4h-7.2a2.4 2.4 0 0 1-2.4-2.4v-7.2a2.4 2.4 0 0 1 2.4-2.4zm25.697 12.703a2.4 2.4 0 0 0 .703-1.697v-8.606a2.4 2.4 0 0 0-2.4-2.4h-7.2a2.4 2.4 0 0 0-2.4 2.4v7.2a2.4 2.4 0 0 1-2.4 2.4h-8.606a2.4 2.4 0 0 0-1.697.703L13.531 36.125a2.4 2.4 0 0 0-.703 1.697v8.606a2.4 2.4 0 0 0 2.4 2.4h7.2a2.4 2.4 0 0 0 2.4-2.4v-7.2a2.4 2.4 0 0 1 2.4-2.4h8.606a2.4 2.4 0 0 0 1.697-.703z"
          opacity=".4"
        />
      </mask>

      <g mask="url(#huly-loading_svg__f)">
        <g class="glow-overlay-top" filter="url(#huly-loading_svg__g)" opacity=".5" style="mix-blend-mode:overlay">
          <ellipse
            cx="46.756"
            cy="13.72"
            fill="#539AF8"
            rx="8.283"
            ry="17.917"
            transform="rotate(-49.071 46.756 13.72)"
          />
        </g>
        <g class="glow-overlay-bottom" filter="url(#huly-loading_svg__h)" opacity=".2" style="mix-blend-mode:overlay">
          <ellipse
            cx="2.687"
            cy="5.811"
            fill="#DA8866"
            rx="2.687"
            ry="5.811"
            transform="scale(-1 1)rotate(49.071 -30.696 -44.394)"
          />
        </g>
      </g>
    </g>

    <defs>
      <filter
        id="huly-loading_svg__c"
        width="49.683"
        height="49.683"
        x="5.987"
        y="5.987"
        color-interpolation-filters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood flood-opacity="0" result="BackgroundImageFix" />
        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
        <feGaussianBlur result="effect1_foregroundBlur" stdDeviation="3.421" />
      </filter>
      <filter
        id="huly-loading_svg__g"
        width="42.858"
        height="40.29"
        x="25.328"
        y="-6.425"
        color-interpolation-filters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood flood-opacity="0" result="BackgroundImageFix" />
        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
        <feGaussianBlur result="effect1_foregroundBlur" stdDeviation="3.421" />
      </filter>
      <filter
        id="huly-loading_svg__h"
        width="23.145"
        height="22.314"
        x="35.185"
        y="2.561"
        color-interpolation-filters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood flood-opacity="0" result="BackgroundImageFix" />
        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
        <feGaussianBlur result="effect1_foregroundBlur" stdDeviation="3.421" />
      </filter>
      <clipPath id="huly-loading_svg__a">
        <rect width="62" height="62" fill="#fff" rx="15" />
      </clipPath>
    </defs>
  </svg>
</div>

<style lang="scss">
  .huly-loading {
    position: relative;
    display: inline-flex;
    justify-content: center;
    align-items: center;

    /* Background corner glows */
    .glow-bottom-left,
    .glow-top-right {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      filter: blur(40px);
    }

    .glow-bottom-left {
      bottom: -50px;
      left: -50px;
      width: 150px;
      height: 150px;
      background: radial-gradient(circle, rgba(218, 136, 102, 0.6) 0%, transparent 70%);
      animation: glowBottomLeft 3s ease-in-out infinite;
    }

    .glow-top-right {
      top: -50px;
      right: -50px;
      width: 150px;
      height: 150px;
      background: radial-gradient(circle, rgba(83, 154, 248, 0.6) 0%, transparent 70%);
      animation: glowTopRight 3s ease-in-out infinite;
      animation-delay: 1.5s;
    }

    /* Icon container */
    .huly-icon {
      position: relative;
      z-index: 1;
      filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.2));

      /* Animate specific icon parts */
      .top-left-block {
        animation: pulseTopLeft 3s ease-in-out infinite;
        animation-delay: 1.5s;
      }

      .bottom-right-block {
        animation: pulseBottomRight 3s ease-in-out infinite;
      }

      .center-connector {
        animation: pulseCenter 3s ease-in-out infinite;
        animation-delay: 0.75s;
      }

      /* Glow overlays */
      .glow-overlay-top {
        animation: glowOverlayTop 3s ease-in-out infinite;
        animation-delay: 1.5s;
      }

      .glow-overlay-bottom {
        animation: glowOverlayBottom 3s ease-in-out infinite;
      }

      .icon-stroke {
        animation: strokePulse 3s ease-in-out infinite;
      }
    }

    /* Size variations */
    &.size-small .huly-icon {
      width: 48px;
      height: 48px;
    }

    &.size-medium .huly-icon {
      width: 80px;
      height: 80px;
    }

    &.size-large .huly-icon {
      width: 120px;
      height: 120px;
    }
  }

  /* Animations */
  @keyframes glowBottomLeft {
    0%,
    100% {
      opacity: 0.3;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.2);
    }
  }

  @keyframes glowTopRight {
    0%,
    100% {
      opacity: 0.3;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.2);
    }
  }

  @keyframes pulseTopLeft {
    0%,
    100% {
      fill: #d5d5d5;
      filter: drop-shadow(0 0 0 rgba(83, 154, 248, 0));
    }
    50% {
      fill: #e8eeff;
      filter: drop-shadow(0 0 8px rgba(83, 154, 248, 0.8));
    }
  }

  @keyframes pulseBottomRight {
    0%,
    100% {
      fill: #d5d5d5;
      filter: drop-shadow(0 0 0 rgba(218, 136, 102, 0));
    }
    50% {
      fill: #ffe8dd;
      filter: drop-shadow(0 0 8px rgba(218, 136, 102, 0.8));
    }
  }

  @keyframes pulseCenter {
    0%,
    100% {
      fill: #d5d5d5;
      filter: drop-shadow(0 0 0 rgba(255, 255, 255, 0));
    }
    50% {
      fill: #f0f0f0;
      filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.6));
    }
  }

  @keyframes glowOverlayTop {
    0%,
    100% {
      opacity: 0.3;
    }
    50% {
      opacity: 0.7;
    }
  }

  @keyframes glowOverlayBottom {
    0%,
    100% {
      opacity: 0.1;
    }
    50% {
      opacity: 0.4;
    }
  }

  @keyframes strokePulse {
    0%,
    100% {
      stroke-opacity: 0.6;
    }
    50% {
      stroke-opacity: 1;
    }
  }

  @keyframes iridescentBorder {
    0% {
      background-position: 0% 50%;
      opacity: 0.4;
    }
    25% {
      opacity: 0.7;
    }
    50% {
      background-position: 100% 50%;
      opacity: 0.8;
    }
    75% {
      opacity: 0.7;
    }
    100% {
      background-position: 0% 50%;
      opacity: 0.4;
    }
  }
</style>
