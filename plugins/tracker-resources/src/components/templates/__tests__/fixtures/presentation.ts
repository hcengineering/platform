export { default as Card } from '@hcengineering/presentation/src/components/Card.svelte'
export { default as SpaceSelector } from './SpaceSelector.svelte'
export const findOne = jest.fn()
export const findAll = jest.fn()
export const createDoc = jest.fn()
interface MockClient {
  findOne: typeof findOne
  findAll: typeof findAll
  createDoc: typeof createDoc
}
export function getClient (): MockClient {
  return { findOne, findAll, createDoc }
}
export default { string: { Copy: 'Copy' } }
