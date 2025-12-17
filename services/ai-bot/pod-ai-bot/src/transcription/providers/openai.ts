// Copyright © 2025 Andrey Sobolev (haiodo@gmail.com)

import { concatLink, MeasureContext } from '@hcengineering/core'
import { TranscriptionOptions, TranscriptionProvider, TranscriptionResult } from '../types'

/**
 * OpenAI Whisper API response with verbose JSON format
 */
interface OpenAIWhisperResponse {
  text: string
  language?: string
  duration?: number
  words?: Array<{
    word: string
    start: number
    end: number
  }>
  segments?: Array<{
    id: number
    seek: number
    start: number
    end: number
    text: string
    tokens: number[]
    temperature: number
    avg_logprob: number
    compression_ratio: number
    no_speech_prob: number
  }>
}

/**
 * OpenAI Whisper API provider
 *
 * Uses the OpenAI Audio Transcriptions API
 * Endpoint: POST https://api.openai.com/v1/audio/transcriptions
 *
 * Supports:
 * - Multiple audio formats (wav, mp3, m4a, etc.)
 * - Language detection or specification
 * - Word-level timestamps with verbose_json response format
 */
export class OpenAIWhisperProvider implements TranscriptionProvider {
  readonly name = 'openai'

  private readonly apiUrl: string

  constructor (
    private readonly ctx: MeasureContext,
    private readonly apiKey: string,
    private readonly model: string = 'whisper-1',
    baseUrl?: string
  ) {
    this.apiUrl = 'https://api.openai.com/v1/audio/transcriptions'
    if (baseUrl !== undefined && baseUrl !== '') {
      if (baseUrl.includes('/v1')) {
        this.apiUrl = concatLink(baseUrl, 'audio/transcriptions')
      } else {
        this.apiUrl = concatLink(baseUrl, 'v1/audio/transcriptions')
      }
    }
  }

  async transcribe (audioData: Buffer, options?: TranscriptionOptions): Promise<TranscriptionResult> {
    const startTime = Date.now()

    try {
      // Build multipart form data
      const boundary = `----WebKitFormBoundary${Date.now().toString(16)}`
      const formParts: Buffer[] = []

      // Add file field
      formParts.push(
        Buffer.from(
          `--${boundary}\r\n` +
            'Content-Disposition: form-data; name="file"; filename="audio.wav"\r\n' +
            'Content-Type: audio/wav\r\n\r\n'
        )
      )
      formParts.push(audioData)
      formParts.push(Buffer.from('\r\n'))

      // Add model field
      formParts.push(
        Buffer.from(`--${boundary}\r\n` + 'Content-Disposition: form-data; name="model"\r\n\r\n' + `${this.model}\r\n`)
      )

      // Add response_format field for verbose JSON with timestamps
      formParts.push(
        Buffer.from(
          `--${boundary}\r\n` + 'Content-Disposition: form-data; name="response_format"\r\n\r\n' + 'verbose_json\r\n'
        )
      )

      // Add timestamp_granularities for word-level timestamps
      if (options?.wordTimestamps !== false) {
        formParts.push(
          Buffer.from(
            `--${boundary}\r\n` +
              'Content-Disposition: form-data; name="timestamp_granularities[]"\r\n\r\n' +
              'word\r\n'
          )
        )
        formParts.push(
          Buffer.from(
            `--${boundary}\r\n` +
              'Content-Disposition: form-data; name="timestamp_granularities[]"\r\n\r\n' +
              'segment\r\n'
          )
        )
      }

      // Add language field if specified
      if (options?.language !== undefined && options.language !== '') {
        formParts.push(
          Buffer.from(
            `--${boundary}\r\n` + 'Content-Disposition: form-data; name="language"\r\n\r\n' + `${options.language}\r\n`
          )
        )
      }

      // Add closing boundary
      formParts.push(Buffer.from(`--${boundary}--\r\n`))

      const body = Buffer.concat(formParts)

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length.toString()
        },
        body
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI Whisper request failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = (await response.json()) as OpenAIWhisperResponse

      const result = this.parseResponse(data)

      const elapsed = Date.now() - startTime
      this.ctx.info('OpenAI Whisper transcription completed', {
        provider: this.name,
        model: this.model,
        language: result.language,
        textLength: result.text.length,
        wordCount: result.words?.length ?? 0,
        elapsedMs: elapsed
      })

      return result
    } catch (err: any) {
      const elapsed = Date.now() - startTime
      this.ctx.error('OpenAI Whisper transcription failed', {
        provider: this.name,
        model: this.model,
        error: err.message,
        elapsedMs: elapsed
      })
      throw err
    }
  }

  /**
   * Parse OpenAI response to standard format
   */
  private parseResponse (data: OpenAIWhisperResponse): TranscriptionResult {
    const result: TranscriptionResult = {
      text: data.text?.trim() ?? '',
      language: data.language
    }

    // Parse words
    if (data.words !== undefined && data.words.length > 0) {
      result.words = data.words.map((w) => ({
        word: w.word.trim(),
        start: w.start,
        end: w.end
      }))
    }

    // Parse segments
    if (data.segments !== undefined && data.segments.length > 0) {
      result.segments = data.segments.map((seg) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text.trim()
      }))

      // Calculate average confidence from segment avg_logprob
      const probabilities = data.segments
        .filter((seg) => seg.avg_logprob !== undefined)
        .map((seg) => Math.exp(seg.avg_logprob))

      if (probabilities.length > 0) {
        result.confidence = probabilities.reduce((a, b) => a + b, 0) / probabilities.length
      }
    }

    return result
  }
}

/**
 * Create OpenAI Whisper provider instance
 */
export function createOpenAIWhisperProvider (
  ctx: MeasureContext,
  apiKey: string,
  model?: string,
  baseUrl?: string
): OpenAIWhisperProvider {
  return new OpenAIWhisperProvider(ctx, apiKey, model ?? 'whisper-1', baseUrl)
}
