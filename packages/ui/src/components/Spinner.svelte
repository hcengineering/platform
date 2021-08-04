
<div class="spinner">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path d="M12 0v1c6.1 0 11 4.9 11 11s-4.9 11-11 11v1c6.6 0 12-5.4 12-12S18.6 0 12 0z" fill="#fff"/>
    <linearGradient id="a" gradientUnits="userSpaceOnUse" x1="0" y1="22" x2="0" y2="2">
      <stop offset="0" stop-color="#fff"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <path d="M12 23C5.9 23 1 18.1 1 12S5.9 1 12 1V0C5.4 0 0 5.4 0 12s5.4 12 12 12v-1z" fill="url(#a)"/>
  </svg>
</div>

<style lang="scss">
  .spinner {
    width: 24px;
    height: 24px;
    -webkit-animation: spinCircle 1s infinite linear;
    animation: spinCircle 1s infinite linear;
  }
  @-webkit-keyframes spinCircle {
    from { -webkit-transform: rotate(0deg); }
    to { -webkit-transform: rotate(-359deg); }
  }
  @keyframes spinCircle {
    from { transform: rotate(0deg); }
    to { transform: rotate(-359deg); }
  }
</style>