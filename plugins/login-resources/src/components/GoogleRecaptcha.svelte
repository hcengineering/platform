<script lang="ts">
  import { onMount } from 'svelte'

  export let googleRecaptchaToken = ''
  export const recaptchaAction = ''

  const sitekey = '' // TODO: Read this from dotenv or from backend on bootstrap.
  const googleRecaptchaUrl = 'https://www.google.com/recaptcha/api.js'

  onMount(async () => {
    await loadRecaptcha()
    await isGoogleRecaptchaReady()

    googleRecaptchaToken = await grecaptcha.execute(sitekey, {
      action: recaptchaAction
    })
  })

  async function isGoogleRecaptchaReady() {
    return new Promise<void>((resolve) => {
      const checkGrecaptcha = () => {
        if (window.grecaptcha?.enterprise) {
          window.grecaptcha.enterprise.ready(() => resolve())
        } else {
          // Retry after a short delay if not yet available
          setTimeout(checkGrecaptcha, 50)
        }
      }
      checkGrecaptcha()
    })
  }

  async function loadRecaptcha() {
    return new Promise<void>((resolve, reject) => {
      const src = `${googleRecaptchaUrl}?render=${sitekey}`

      if (doesGoogleRecaptchaScriptTagExists(src)) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = `${googleRecaptchaUrl}?render=${sitekey}`
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'))
      document.head.appendChild(script)
    })
  }

  function doesGoogleRecaptchaScriptTagExists(src: string): boolean {
    const element = document.querySelector(`[src="${src}"]`)

    return Boolean(element)
  }
</script>
