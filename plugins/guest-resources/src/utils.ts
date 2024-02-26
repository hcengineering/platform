export function decodeTokenPayload (token: string): any {
  const parts = token.split('.')

  const payload = parts[1]

  const decodedPayload = atob(payload)

  const parsedPayload = JSON.parse(decodedPayload)

  return parsedPayload
}
