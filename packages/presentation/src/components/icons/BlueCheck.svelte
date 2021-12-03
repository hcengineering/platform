<script lang="ts">
  export let size: 'small' | 'medium' | 'large'
  const fill: string = 'currentColor'
</script>

<svg class="svg-{size}" {fill} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
  <svg viewBox="0 0 24 24" {fill} xmlns="http://www.w3.org/2000/svg">
    <g filter="url(#filter0_b_991_16450)">
    <rect width="24" height="24" rx="12" fill="#4474F6"/>
    </g>
    <path d="M8.25 12L10.9989 15L15.75 9" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <defs>
    <filter id="filter0_b_991_16450" x="-100" y="-100" width="224" height="224" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
    <feFlood flood-opacity="0" result="BackgroundImageFix"/>
    <feGaussianBlur in="BackgroundImage" stdDeviation="50"/>
    <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur_991_16450"/>
    <feBlend mode="normal" in="SourceGraphic" in2="effect1_backgroundBlur_991_16450" result="shape"/>
    </filter>
    </defs>
    </svg>
    
</svg>
