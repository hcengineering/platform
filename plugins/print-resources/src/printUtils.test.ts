import type { Doc } from '@hcengineering/core'

import { Analytics } from '@hcengineering/analytics'
import { createPublicLink } from '@hcengineering/guest'
import { getMetadata } from '@hcengineering/platform'
import { printToPDF } from '@hcengineering/print'
import { signPDF } from '@hcengineering/sign'
import { getDocTitle } from '@hcengineering/view-resources'

import { ensurePublicLink, printAll } from './printUtils'

jest.mock('@hcengineering/analytics', () => ({
  Analytics: {
    handleError: jest.fn()
  }
}))

jest.mock('@hcengineering/guest', () => ({
  __esModule: true,
  default: {
    class: {
      PublicLink: 'guest:class:PublicLink'
    }
  },
  createPublicLink: jest.fn()
}))

jest.mock('@hcengineering/view-resources', () => ({
  getDocTitle: jest.fn(),
  getObjectLinkFragment: jest.fn(async () => ({ path: [], fragment: 'x' }))
}))

jest.mock('@hcengineering/platform', () => {
  const actual = jest.requireActual('@hcengineering/platform')
  return {
    ...actual,
    getMetadata: jest.fn()
  }
})

jest.mock('@hcengineering/presentation', () => ({
  __esModule: true,
  default: {
    metadata: {
      Token: 'token'
    }
  },
  getFileUrl: jest.fn()
}))

jest.mock('@hcengineering/print', () => ({
  printToPDF: jest.fn()
}))

jest.mock('@hcengineering/sign', () => ({
  signPDF: jest.fn()
}))

function buildDoc (id: string): Doc {
  return {
    _id: id as any,
    _class: 'test:class:Doc' as any,
    space: 'space' as any,
    modifiedBy: 'user' as any,
    modifiedOn: Date.now()
  }
}

describe('printUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getMetadata as jest.Mock).mockReturnValue('token')
    ;(getDocTitle as jest.Mock).mockResolvedValue('DocTitle')
    ;(printToPDF as jest.Mock).mockResolvedValue('blob-1')
    ;(signPDF as jest.Mock).mockResolvedValue('signed-blob-1')
  })

  it('ensurePublicLink returns existing link with url', async () => {
    const client = {
      findOne: jest.fn().mockResolvedValue({ _id: 'l1', url: 'https://public/link' })
    } as any

    const doc = buildDoc('doc-1')
    const result = await ensurePublicLink(client, doc)

    expect(result?.url).toBe('https://public/link')
    expect(createPublicLink).not.toHaveBeenCalled()
  })

  it('printAll waits for async public link url and then prints', async () => {
    jest.useFakeTimers()
    try {
      const doc = buildDoc('doc-2')
      const client = {
        getHierarchy: jest.fn().mockReturnValue({
          classHierarchyMixin: jest.fn().mockReturnValue(undefined)
        }),
        findOne: jest
          .fn()
          // initial ensurePublicLink read
          .mockResolvedValueOnce(undefined)
          // "created" check
          .mockResolvedValueOnce(undefined)
          // retry loop: first no url, then with url
          .mockResolvedValueOnce({ _id: 'l2', url: '' })
          .mockResolvedValueOnce({ _id: 'l2', url: 'https://public/ok' })
      } as any

      const promise = printAll(client, [doc], false, {
        onProgress: jest.fn(),
        getCancelled: () => false
      })

      await jest.advanceTimersByTimeAsync(300)
      const results = await promise

      expect(createPublicLink).toHaveBeenCalledTimes(1)
      expect(printToPDF).toHaveBeenCalledWith('https://public/ok', 'token')
      expect(results).toHaveLength(1)
      expect(results[0]).toEqual({
        blobId: 'blob-1',
        title: 'DocTitle.pdf',
        error: undefined
      })
    } finally {
      jest.useRealTimers()
    }
  })

  it('printAll reports detailed error when public link never appears', async () => {
    jest.useFakeTimers()
    try {
      const doc = buildDoc('doc-3')
      const client = {
        getHierarchy: jest.fn().mockReturnValue({
          classHierarchyMixin: jest.fn().mockReturnValue(undefined)
        }),
        findOne: jest
          .fn()
          // initial reads
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined)
          // 10 retries with empty url
          .mockResolvedValue({ _id: 'l3', url: '' })
      } as any

      const promise = printAll(client, [doc], false, {
        onProgress: jest.fn(),
        getCancelled: () => false
      })

      await jest.advanceTimersByTimeAsync(3000)
      const results = await promise

      expect(results).toHaveLength(1)
      expect(results[0].blobId).toBe('')
      expect(results[0].title).toBe('DocTitle.pdf')
      expect(results[0].error).toContain('Could not get public link')
      expect(results[0].error).toContain('doc-3')
      expect(printToPDF).not.toHaveBeenCalled()
    } finally {
      jest.useRealTimers()
    }
  })

  it('printAll catches print service error and adds doc context', async () => {
    const doc = buildDoc('doc-4')
    const client = {
      findOne: jest.fn().mockResolvedValue({ _id: 'l4', url: 'https://public/fail' })
    } as any
    ;(printToPDF as jest.Mock).mockRejectedValue(new Error('Print service failed'))

    const results = await printAll(client, [doc], true, {
      onProgress: jest.fn(),
      getCancelled: () => false
    })

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(Analytics.handleError).toHaveBeenCalledTimes(1)
    expect(signPDF).not.toHaveBeenCalled()
    expect(results).toHaveLength(1)
    expect(results[0].blobId).toBe('')
    expect(results[0].error).toContain('Print service failed')
    expect(results[0].error).toContain('doc-4')
  })

  it('printAll signs pdf when signed=true', async () => {
    const doc = buildDoc('doc-5')
    const client = {
      findOne: jest.fn().mockResolvedValue({ _id: 'l5', url: 'https://public/sign' })
    } as any

    const results = await printAll(client, [doc], true, {
      onProgress: jest.fn(),
      getCancelled: () => false
    })

    expect(printToPDF).toHaveBeenCalledWith('https://public/sign', 'token')
    expect(signPDF).toHaveBeenCalledWith('blob-1', 'token')
    expect(results[0].blobId).toBe('signed-blob-1')
  })
})
