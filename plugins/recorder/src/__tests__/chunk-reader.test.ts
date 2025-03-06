import { ChunkReader } from '../stream'

describe('ChunkReader', () => {
  let chunkReader: ChunkReader

  beforeEach(() => {
    chunkReader = new ChunkReader()
  })

  test('Initial state: read returns done when no chunks and closed', async () => {
    chunkReader.close()
    const result = await chunkReader.read()
    expect(result).toEqual({ done: true, value: undefined })
  })

  test('Read returns pushed chunks', async () => {
    const blob1 = new Blob(['chunk1'])
    const blob2 = new Blob(['chunk2'])

    chunkReader.push(blob1)
    chunkReader.push(blob2)

    const result1 = await chunkReader.read()
    expect(result1).toEqual({ done: false, value: blob1 })

    const result2 = await chunkReader.read()
    expect(result2).toEqual({ done: false, value: blob2 })
  })

  test('Read waits for chunks if none are available', async () => {
    const blob = new Blob(['chunk'])

    // Start reading before pushing a chunk
    const readPromise = chunkReader.read()

    // Push a chunk after a delay
    setTimeout(() => {
      chunkReader.push(blob)
    }, 10)

    const result = await readPromise
    expect(result).toEqual({ done: false, value: blob })
  })

  test('Close resolves pending read with done', async () => {
    const readPromise = chunkReader.read()

    setTimeout(() => {
      chunkReader.close()
    }, 10)

    const result = await readPromise
    expect(result).toEqual({ done: true, value: undefined })
  })

  test('Push resolves pending read with the chunk', async () => {
    const blob = new Blob(['chunk'])

    const readPromise = chunkReader.read()

    setTimeout(() => {
      chunkReader.push(blob)
    }, 10)

    const result = await readPromise
    expect(result).toEqual({ done: false, value: blob })
  })

  test('Read returns done after all chunks are read and reader is closed', async () => {
    const blob = new Blob(['chunk'])

    chunkReader.push(blob)
    chunkReader.close()

    const result1 = await chunkReader.read()
    expect(result1).toEqual({ done: false, value: blob })

    const result2 = await chunkReader.read()
    expect(result2).toEqual({ done: true, value: undefined })
  })
})
