import { hashAttrs, stripHash } from '../utils'

describe('hashAttrs', () => {
  it('should return a hash of length 8', () => {
    const attrs = { a: 1 }
    const hash = hashAttrs(attrs)
    expect(hash.length).toEqual(8)
  })
  it('should return the same hash for the same attrs', () => {
    const attrs = { a: 1, b: 2 }
    const hash1 = hashAttrs(attrs)
    const hash2 = hashAttrs(attrs)
    expect(hash1).toEqual(hash2)
  })

  it('should return different hashes for different attrs', () => {
    const attrs1 = { a: 1, b: 2 }
    const attrs2 = { a: 1, b: 3 }
    const hash1 = hashAttrs(attrs1)
    const hash2 = hashAttrs(attrs2)
    expect(hash1).not.toEqual(hash2)
  })
})

describe('stripHash', () => {
  it('should return the name without the hash', () => {
    const name = 'bold--c0decafe'
    const result = stripHash(name)
    expect(result).toEqual('bold')
  })

  it('should return the original name if no hash is present', () => {
    const name = 'bold'
    const result = stripHash(name)
    expect(result).toEqual(name)
  })

  it('should return the original name if the hash is not 8 characters long', () => {
    const name = 'bold--1234567'
    const result = stripHash(name)
    expect(result).toEqual(name)
  })

  it('should return the original name if the hash is not a valid base64 string', () => {
    const name = 'bold--invalid!'
    const result = stripHash(name)
    expect(result).toEqual(name)
  })
})
