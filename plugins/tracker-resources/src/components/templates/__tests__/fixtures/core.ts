export const generateId = jest.fn(() => 'fresh-child')
export function getCurrentAccount (): { uuid: string } {
  return { uuid: 'copying-account' }
}
