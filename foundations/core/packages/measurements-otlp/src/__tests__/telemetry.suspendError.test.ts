import { OpenTelemetryMetricsContext } from '../telemetry'

describe('OpenTelemetryMetricsContext suspendErrors handling', () => {
  test('when suspendErrors is true the span does NOT record exception or set status', async () => {
    const mockSpan = {
      recordException: jest.fn(),
      setStatus: jest.fn(),
      end: jest.fn(),
      setAttribute: jest.fn()
    } as any

    const mockTracer = {
      startSpan: jest.fn().mockReturnValue(mockSpan)
    } as any

    const ctx = new OpenTelemetryMetricsContext('root', mockTracer, undefined, undefined, {})

    await expect(
      ctx.with(
        'op',
        {},
        () => Promise.reject(new Error('boom')), // operation returns a rejected promise
        undefined,
        { suspendErrors: true }
      )
    ).rejects.toThrow('boom')

    expect(mockSpan.recordException).not.toHaveBeenCalled()
    expect(mockSpan.setStatus).not.toHaveBeenCalled()
  })

  test('when suspendErrors is not true the span records exception and sets error status', async () => {
    const mockSpan = {
      recordException: jest.fn(),
      setStatus: jest.fn(),
      end: jest.fn(),
      setAttribute: jest.fn()
    } as any

    const mockTracer = {
      startSpan: jest.fn().mockReturnValue(mockSpan)
    } as any

    const ctx = new OpenTelemetryMetricsContext('root', mockTracer, undefined, undefined, {})

    await expect(ctx.with('op', {}, () => Promise.reject(new Error('boom')), undefined, {})).rejects.toThrow('boom')

    expect(mockSpan.recordException).toHaveBeenCalled()
    expect(mockSpan.setStatus).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }))
  })
})
