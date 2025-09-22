import { locationToUrl } from '../location'
import { type Location } from '../types'

// Mock svelte/store to avoid ES module issues in Jest
jest.mock('svelte/store', () => ({
  derived: jest.fn(),
  get: jest.fn(),
  writable: jest.fn()
}))

describe('location', () => {
  it('should translate location to url', () => {
    const loc: Location = {
      path: ['x', 'y']
    }
    const url = locationToUrl(loc)
    expect(url).toBe('/x/y')
  })
})
