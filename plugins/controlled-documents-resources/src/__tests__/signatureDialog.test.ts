/**
 * @jest-environment jsdom
 * @jest-environment-options {"customExportConditions":["browser"]}
 */

import { getClient, type AccountClient, type SocialId } from '@hcengineering/account-client'
import { Analytics } from '@hcengineering/analytics'
import {
  type Account,
  AccountRole,
  type AccountUuid,
  type PersonId,
  SocialIdType,
  setCurrentAccount
} from '@hcengineering/core'
import { tick } from 'svelte'

import SignatureDialog from '../components/SignatureDialog.svelte'
import documents from '../plugin'

jest.mock('@hcengineering/analytics', () => ({ Analytics: { handleError: jest.fn() } }))
jest.mock('@hcengineering/account-client', () => ({ getClient: jest.fn() }))
jest.mock('@hcengineering/ui', () => ({
  ...jest.requireActual('./fixtures/ui'),
  // The production countdown imports Label from the ui index, so it is loaded only once this mock exists.
  get TimeLeft () {
    return jest.requireActual('@hcengineering/ui/src/components/TimeLeft.svelte').default
  }
}))
// The dialog only reads the token metadata id; the real package index also evaluates its drafts store on load.
jest.mock('@hcengineering/presentation', () => ({
  __esModule: true,
  default: { metadata: { Token: 'presentation:metadata:Token' } }
}))
jest.mock('@hcengineering/ui/src/components/Label.svelte', () => jest.requireActual('./fixtures/Text.svelte'))
jest.mock('../components/requests/StatusControl.svelte', () => jest.requireActual('./fixtures/Text.svelte'))
jest.mock('../utils', () => ({ loginIntlFieldNames: { email: 'email', password: 'password' } }))
jest.mock('../plugin', () => ({
  __esModule: true,
  default: {
    string: Object.fromEntries(
      [
        'ConfirmApproval',
        'ConfirmRejection',
        'Email',
        'Password',
        'VerificationCode',
        'SignatureNoEmail',
        'SignatureOtpHint',
        'SignatureOtpSent',
        'SendVerificationCode',
        'RejectionReason',
        'ProvideRejectionReason',
        'SignatureAccountMismatch',
        'ResendCodeIn',
        'FieldIsEmpty'
      ].map((key) => [key, key])
    )
  }
}))

const identity: SocialId = {
  _id: 'email-id' as PersonId,
  personUuid: 'me' as AccountUuid,
  type: SocialIdType.EMAIL,
  value: 'signer@example.com',
  key: 'email:signer@example.com',
  verifiedOn: 1
}
// Core stays real: a spread mock of it re-enters itself through core's internal `import from '.'` while loading.
const account: Account = {
  uuid: 'me' as AccountUuid,
  role: AccountRole.User,
  primarySocialId: identity._id,
  socialIds: [identity._id],
  fullSocialIds: [identity]
}
const client = {
  checkHasPassword: jest.fn(),
  getSocialIds: jest.fn(),
  loginOtp: jest.fn(),
  validateOtp: jest.fn(),
  login: jest.fn()
}
let dialog: SignatureDialog | undefined
const handleError = jest.spyOn(Analytics, 'handleError')

function deferred<T> (): { promise: Promise<T>, resolve: (value: T) => void } {
  let complete: (value: T) => void = () => {
    throw new Error('Deferred not initialized')
  }
  const promise = new Promise<T>((resolve) => {
    complete = resolve
  })
  return { promise, resolve: complete }
}

// DOM mutations and held RPCs are explicit completion signals, without microtask flushing.
async function until (predicate: () => boolean): Promise<void> {
  if (predicate()) return
  await new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      if (predicate()) {
        observer.disconnect()
        resolve()
      }
    })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
  })
}

function input (name: string): HTMLInputElement {
  const result = document.querySelector(`input[name="${name}"]`)
  if (!(result instanceof HTMLInputElement)) throw new Error(`Missing input ${name}`)
  return result
}

function button (label: string): HTMLButtonElement {
  const result = Array.from(document.querySelectorAll('button')).find((entry) => entry.textContent === label)
  if (result === undefined) throw new Error(`Missing button ${label}`)
  return result
}

async function fill (field: HTMLInputElement, value: string): Promise<void> {
  field.value = value
  field.dispatchEvent(new Event('input', { bubbles: true }))
  await tick()
}

function mount (isRejection = false): jest.Mock {
  dialog = new SignatureDialog({ target: document.body, props: { isRejection } })
  const close = jest.fn()
  dialog.$on('close', close)
  return close
}

beforeEach(() => {
  jest.clearAllMocks()
  setCurrentAccount(account)
  client.checkHasPassword.mockResolvedValue(false)
  client.getSocialIds.mockResolvedValue([identity])
  client.loginOtp.mockResolvedValue({ sent: true, retryOn: Date.now() + 30000 })
  client.validateOtp.mockResolvedValue({ account: 'me' })
  client.login.mockResolvedValue({ account: 'me' })
  jest.mocked(getClient).mockReturnValue(client as unknown as AccountClient)
})

afterEach(() => {
  dialog?.$destroy()
  dialog = undefined
  document.body.replaceChildren()
})

it.each([true, false])('renders the actual dialog controls for hasPassword=%s after loading', async (hasPassword) => {
  const password = deferred<boolean>()
  client.checkHasPassword.mockReturnValue(password.promise)
  mount()
  expect(document.querySelector('[data-testid="loading"]')).not.toBeNull()
  expect(button('Submit').disabled).toBe(true)
  expect(document.querySelector('input[type="password"]')).toBeNull()
  password.resolve(hasPassword)
  await until(() =>
    hasPassword
      ? document.querySelector('input[type="password"]') !== null
      : document.body.textContent?.includes('SendVerificationCode')
  )
  expect(input(documents.string.Email).value).toBe(identity.value)
  expect(input(documents.string.Email).disabled).toBe(true)
  expect(document.querySelector('input[type="password"]') !== null).toBe(hasPassword)
  expect(document.querySelector(`input[name="${documents.string.VerificationCode}"]`) !== null).toBe(!hasPassword)
  const field = input(hasPassword ? documents.string.Password : documents.string.VerificationCode)
  const labelId = field.getAttribute('aria-labelledby')
  expect(labelId).not.toBeNull()
  expect(labelId === null ? undefined : document.getElementById(labelId)?.textContent).toBe(
    hasPassword ? documents.string.Password : documents.string.VerificationCode
  )
})

it('keeps password controls when password detection fails', async () => {
  const error = new Error('password lookup failed')
  client.checkHasPassword.mockRejectedValue(error)
  mount()
  await until(() => document.querySelector('input[type="password"]') !== null)
  expect(handleError).toHaveBeenCalledWith(error)
  expect(document.body.textContent).not.toContain('SendVerificationCode')
})

it('blocks initialization when identities fail to load', async () => {
  const error = new Error('identity lookup failed')
  client.getSocialIds.mockRejectedValue(error)
  mount()
  await until(() => document.querySelector('[data-testid="loading"]') === null)
  expect(button('Submit').disabled).toBe(true)
  expect(document.querySelector('input[type="password"]')).toBeNull()
  expect(document.body.textContent).not.toContain('SendVerificationCode')
  expect(handleError).toHaveBeenCalledWith(error)
})

it('blocks OTP when there is no verified email', async () => {
  client.getSocialIds.mockResolvedValue([{ ...identity, verifiedOn: undefined }])
  mount()
  await until(() => document.body.textContent?.includes('SignatureNoEmail'))
  expect(button('Submit').disabled).toBe(true)
  expect(document.querySelector(`input[name="${documents.string.VerificationCode}"]`)).toBeNull()
  expect(client.loginOtp).not.toHaveBeenCalled()
})

it('locks OTP address, requires rejection text, disables pending controls and closes once on success', async () => {
  const close = mount(true)
  await until(() => document.body.textContent?.includes('SendVerificationCode'))
  const send = deferred<{ sent: boolean, retryOn: number }>()
  client.loginOtp.mockReturnValue(send.promise)
  button('SendVerificationCode').click()
  await tick()
  expect(button('Submit').disabled).toBe(true)
  expect(button('SendVerificationCode').disabled).toBe(true)
  expect(input(documents.string.VerificationCode).disabled).toBe(true)
  send.resolve({ sent: true, retryOn: Date.now() + 30000 })
  await until(() => !input(documents.string.VerificationCode).disabled)
  expect(client.loginOtp).toHaveBeenCalledWith(identity.value)
  expect(button('SendVerificationCode').disabled).toBe(true)
  expect(document.querySelector('[role="status"]')?.textContent).toContain('ResendCodeIn')
  await fill(input(documents.string.VerificationCode), '123456')
  expect(button('Submit').disabled).toBe(true)
  const reason = document.querySelector('label input')
  if (!(reason instanceof HTMLInputElement)) throw new Error('Missing rejection field')
  await fill(reason, '   ')
  expect(button('Submit').disabled).toBe(true)
  await fill(reason, 'Needs revision')
  expect(button('Submit').disabled).toBe(false)
  const verification = deferred<{ account: string }>()
  client.validateOtp.mockReturnValue(verification.promise)
  button('Submit').click()
  await tick()
  expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-busy')).toBe('true')
  expect(button('Submit').disabled).toBe(true)
  expect(input(documents.string.VerificationCode).disabled).toBe(true)
  expect(reason.disabled).toBe(true)
  button('Submit').click()
  expect(client.validateOtp).toHaveBeenCalledTimes(1)
  expect(client.validateOtp).toHaveBeenCalledWith(identity.value, '123456')
  expect(close).not.toHaveBeenCalled()
  verification.resolve({ account: 'me' })
  await until(() => document.querySelector('[role="dialog"]')?.getAttribute('aria-busy') === 'false')
  expect(close).toHaveBeenCalledTimes(1)
  expect(close.mock.calls[0][0].detail).toEqual({ rejectionNote: 'Needs revision' })
})

it('counts down the resend delay and allows a new code request when it expires', async () => {
  client.loginOtp.mockImplementation(async () => ({ sent: true, retryOn: Date.now() + 1500 }))
  mount()
  await until(() => document.body.textContent?.includes('SendVerificationCode'))
  button('SendVerificationCode').click()
  await until(() => document.querySelector('[role="status"]') !== null)
  expect(button('SendVerificationCode').disabled).toBe(true)
  expect(document.querySelector('[role="status"]')?.textContent).toMatch(/ResendCodeIn\s*\d+\D\d+/)
  // TimeLeft ticks once per second and emits timeout when the remaining time reaches zero.
  await until(() => !button('SendVerificationCode').disabled)
  expect(document.querySelector('[role="status"]')).toBeNull()
  button('SendVerificationCode').click()
  await tick()
  expect(client.loginOtp).toHaveBeenCalledTimes(2)
}, 10000)

it('keeps failed password confirmation open, then closes for the matching account', async () => {
  client.checkHasPassword.mockResolvedValue(true)
  const first = deferred<{ account: string }>()
  const second = deferred<{ account: string }>()
  client.login.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const close = mount()
  await until(() => document.querySelector('input[type="password"]') !== null)
  await fill(input(documents.string.Password), 'password')
  button('Submit').click()
  await tick()
  expect(button('Submit').disabled).toBe(true)
  first.resolve({ account: 'other' })
  await until(() => !button('Submit').disabled)
  expect(close).not.toHaveBeenCalled()
  button('Submit').click()
  await tick()
  expect(input(documents.string.Password).disabled).toBe(true)
  second.resolve({ account: 'me' })
  await until(() => document.querySelector('[role="dialog"]')?.getAttribute('aria-busy') === 'false')
  expect(close).toHaveBeenCalledTimes(1)
  expect(client.login).toHaveBeenCalledWith(identity.value, 'password')
})

it('forwards cancellation without verifying credentials', async () => {
  const close = mount()
  await until(() => document.body.textContent?.includes('SendVerificationCode'))
  button('Cancel').click()
  expect(close).toHaveBeenCalledTimes(1)
  expect(close.mock.calls[0][0].detail).toBeUndefined()
  expect(client.login).not.toHaveBeenCalled()
  expect(client.validateOtp).not.toHaveBeenCalled()
})
