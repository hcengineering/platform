import { getLevelInfo } from '@hcengineering/rating'

describe('raiting to level tests', () => {
  it('check levels', () => {
    const values = [getLevelInfo(2.2), getLevelInfo(2.3), getLevelInfo(2.4)]
    expect(values.length).toBeGreaterThan(0)
  })
})
