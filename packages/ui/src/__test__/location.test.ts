import { locationToUrl } from '../location'
import { Location } from '../types'

describe('location', () => {
  it('should translate location to url', () => {
    const loc: Location = {
      path: ['x', 'y']
    }
    const url = locationToUrl(loc)
    expect(url).toBe('/x/y')
  })
})
