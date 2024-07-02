<script lang="ts">
  import { Label } from '@hcengineering/ui'
  import login from '../plugin'
  import { getMetadata } from '@hcengineering/platform'

  const termsOfServiceUrl = getMetadata(login.metadata.TermsOfServiceUrl)
  const privacyPolicyUrl = getMetadata(login.metadata.PrivacyPolicyUrl)
</script>

{#if termsOfServiceUrl !== undefined && privacyPolicyUrl !== undefined}
  <div class="terms-agreement">
    <span><Label label={login.string.TermsAgreement} /></span>
    <a href={termsOfServiceUrl} target="_blank">
      <Label label={login.string.TermsOfService} />
    </a>
    <span>&</span>
    <a href={privacyPolicyUrl} target="_blank">
      <Label label={login.string.PrivacyPolicy} />.
    </a>
  </div>
{/if}

<style>
  .terms-agreement {
    font-size: 0.8rem;
    color: var(--theme-dark-color);
    grid-column-start: 1;
    grid-column-end: 3;
  }

  .terms-agreement a {
    color: var(--theme-content-color);
    font-weight: 500;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
</style>
