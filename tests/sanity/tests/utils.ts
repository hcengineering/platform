import { Page } from '@playwright/test'

export async function openWorkbench (page: Page): Promise<void> {
  page.on('pageerror', exception => {
    console.log('Uncaught exception:')
    console.log(exception.message)
  })

  await page.goto('http://localhost:8083/login%3Acomponent%3ALoginApp/login')

  await page.evaluate(() => {
    localStorage.setItem('login:metadata:LoginToken', 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6InVzZXIxIiwid29ya3NwYWNlIjoic2FuaXR5LXdzIn0.hfUCqePHO-WNps2by4B-CYGKIpDpLG0WVCUUtU-SVI4')
    localStorage.setItem('login:metadata:LoginEmail', 'user1')
    localStorage.setItem('login:metadata:LoginEndpoint', 'ws://localhost:3334')
  })

  await page.goto('http://localhost:8083/workbench%3Acomponent%3AWorkbenchApp')
  await page.waitForSelector('[id="app-contact\\:string\\:Contacts"]')
}

function toHex (value: number, chars: number): string {
  const result = value.toString(16)
  if (result.length < chars) {
    return '0'.repeat(chars - result.length) + result
  }
  return result
}

let counter = (Math.random() * (1 << 24)) | 0
const random = toHex((Math.random() * (1 << 24)) | 0, 6) + toHex((Math.random() * (1 << 16)) | 0, 4)

function timestamp (): string {
  const time = (Date.now() / 1000) | 0
  return toHex(time, 8)
}

function count (): string {
  const val = counter++ & 0xffffff
  return toHex(val, 6)
}

/**
 * @public
 * @returns
 */
export function generateId (len = 100): string {
  const v = (timestamp() + random)
  let s = v.length - len
  if (s < 0) {
    s = 0
  }
  const r = v.slice(s, v.length) + count()
  return r
}
