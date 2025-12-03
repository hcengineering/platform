// Copyright © 2025 Andrey Sobolev (haiodo@gmail.com)

import { MeasureContext } from '@hcengineering/core'

import {
  SttProviderType,
  TranscriptionConfig,
  TranscriptionProvider,
  TranscriptionQueueTask,
  TranscriptionResult,
  TranscriptionOptions,
  TranscriptionWord,
  TranscriptionSegment,
  VadResult
} from './types'

import { createDeepgramProvider } from './providers/deepgram'
import { createOpenAIWhisperProvider } from './providers/openai'

import { analyzeAudio, parseWavHeader, getAudioDuration } from './vad'
import { normalizeAudio, getAudioStats } from './normalize'

// Re-export types
export type {
  SttProviderType,
  TranscriptionConfig,
  TranscriptionProvider,
  TranscriptionQueueTask,
  TranscriptionResult,
  TranscriptionOptions,
  TranscriptionWord,
  TranscriptionSegment,
  VadResult
}

// Re-export utilities
export { analyzeAudio, parseWavHeader, getAudioDuration }
export { normalizeAudio, getAudioStats }

// Re-export provider creators
export { createDeepgramProvider } from './providers/deepgram'
export { createOpenAIWhisperProvider } from './providers/openai'

// Re-export consumer
export {
  createTranscriptionConsumer,
  TranscriptionConsumer,
  type SendToDeadLetterCallback,
  type RetryConfig
} from './consumer'

/**
 * Create a transcription provider based on configuration
 *
 * @param ctx - Measure context for logging
 * @param config - Transcription configuration
 * @returns Configured transcription provider or undefined if misconfigured
 */
export function createTranscriptionProvider (ctx: MeasureContext, config: TranscriptionConfig): TranscriptionProvider {
  switch (config.provider) {
    case 'deepgram': {
      if (config.apiKey === undefined || config.apiKey === '') {
        ctx.error('Deepgram API key not configured')
        throw new Error('Deepgram API key is not configured')
      }
      return createDeepgramProvider(ctx, config.apiKey, config.model)
    }

    case 'openai': {
      if (config.apiKey === undefined || config.apiKey === '') {
        ctx.error('OpenAI API key not configured')
        throw new Error('OpenAI API key is not configured')
      }
      return createOpenAIWhisperProvider(ctx, config.apiKey, config.model ?? 'whisper-1', config.url)
    }

    default: {
      ctx.error('Unknown transcription provider', { provider: config.provider })
      throw new Error('No transcript provider configured')
    }
  }
}

/**
 * Get default transcription configuration from environment variables
 *
 * Environment variables:
 * - STT_PROVIDER: 'openai' | 'deepgram' (default: 'openai')
 * - STT_URL: API URL for the provider (use for self-hosted OpenAI-compatible services)
 * - STT_API_KEY: API key (required for cloud providers, use 'not-needed' for self-hosted)
 * - STT_MODEL: Model name (optional, provider-specific defaults apply)
 */
export function getTranscriptionConfigFromEnv (): TranscriptionConfig {
  const provider = (process.env.STT_PROVIDER ?? 'openai') as SttProviderType

  return {
    provider,
    url: process.env.STT_URL,
    apiKey: process.env.STT_API_KEY,
    model: process.env.STT_MODEL,

    // VAD
    vadRmsThreshold: parseFloat(process.env.VAD_RMS_THRESHOLD ?? '0.02'),
    vadSpeechRatioThreshold: parseFloat(process.env.VAD_SPEECH_RATIO_THRESHOLD ?? '0.1')
  }
}
