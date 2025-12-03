// Copyright © 2025 Andrey Sobolev (haiodo@gmail.com)

import { gunzip as _gunzip } from 'zlib'

import { MeasureContext, withContext, WorkspaceUuid, type WorkspaceIds } from '@hcengineering/core'
import { ConsumerControl, StorageAdapter } from '@hcengineering/server-core'

import { TranscriptionQueueTask, TranscriptionProvider, TranscriptionConfig } from './types'
import { analyzeAudio } from './vad'
import { normalizeAudio } from './normalize'
import { createTranscriptionProvider } from './index'
import { promisify } from 'util'
import path from 'path'
import { writeFile } from 'fs/promises'

const gunzip = promisify(_gunzip)

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2
}

/**
 * Error types for classification
 */
enum TranscriptionErrorType {
  /** File not found in storage - non-retryable */
  FileNotFound = 'file_not_found',
  /** Transcription service unavailable - retryable */
  ServiceUnavailable = 'service_unavailable',
  /** Other transient error - retryable */
  TransientError = 'transient_error',
  /** Permanent error - non-retryable */
  PermanentError = 'permanent_error'
}

/**
 * Callback type for sending transcription results (legacy, creates new message)
 */
export type TranscriptSendCallback = (
  ctx: MeasureContext,
  workspace: WorkspaceUuid,
  roomName: string,
  participant: string,
  transcript: string,
  startTimeSec: number,
  endTimeSec: number
) => Promise<void>

/**
 * Callback type for updating/deleting placeholder message
 * If text is null or empty, the message should be deleted
 */
export type UpdateMessageCallback = (
  ctx: MeasureContext,
  workspace: WorkspaceUuid,
  roomName: string,
  messageId: string,
  text: string | null
) => Promise<void>

/**
 * Callback type for getting workspace storage info
 */
export type GetWorkspaceStorageCallback = (workspace: WorkspaceUuid) => Promise<
| {
  wsIds: WorkspaceIds
}
| undefined
>

/**
 * Callback type for sending failed tasks to dead letter queue
 */
export type SendToDeadLetterCallback = (
  ctx: MeasureContext,
  workspace: WorkspaceUuid,
  task: TranscriptionQueueTask,
  error: string,
  errorType: string
) => Promise<void>

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

/**
 * Sleep for a given number of milliseconds
 */
async function sleep (ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateBackoffDelay (attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt)
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs)
  // Add jitter (±20%)
  const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1)
  return Math.floor(cappedDelay + jitter)
}

/**
 * Classify error type for retry logic
 */
function classifyError (err: Error): TranscriptionErrorType {
  const message = err.message.toLowerCase()

  // File not found errors
  if (
    message.includes('not found') ||
    message.includes('no such file') ||
    message.includes('does not exist') ||
    message.includes('404')
  ) {
    return TranscriptionErrorType.FileNotFound
  }

  // Service unavailable errors (retryable)
  if (
    message.includes('service unavailable') ||
    message.includes('503') ||
    message.includes('502') ||
    message.includes('504') ||
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('socket hang up') ||
    message.includes('network') ||
    message.includes('temporarily unavailable') ||
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('too many requests')
  ) {
    return TranscriptionErrorType.ServiceUnavailable
  }

  // Other potentially transient errors
  if (message.includes('500') || message.includes('internal server error') || message.includes('bad gateway')) {
    return TranscriptionErrorType.TransientError
  }

  // Default to permanent error
  return TranscriptionErrorType.PermanentError
}

/**
 * Transcription queue consumer
 *
 * Processes audio chunks from the queue:
 * 1. Loads gzipped WAV from storage
 * 2. Verifies speech presence with VAD
 * 3. Transcribes using configured provider
 * 4. Handles overlap correction
 * 5. Sends transcript to platform
 * 6. Cleans up storage
 *
 * Features:
 * - Retry with exponential backoff for transient errors
 * - Dead letter queue for permanent failures
 * - Heartbeat during retries to keep queue healthy
 */
export class TranscriptionConsumer {
  private readonly provider: TranscriptionProvider
  private readonly retryConfig: RetryConfig

  constructor (
    private readonly ctx: MeasureContext,
    private readonly config: TranscriptionConfig,
    private readonly storageAdapter: StorageAdapter,
    private readonly getWorkspaceStorage: GetWorkspaceStorageCallback,
    private readonly sendTranscript: TranscriptSendCallback,
    private readonly updateMessage: UpdateMessageCallback,
    private readonly sendToDeadLetter?: SendToDeadLetterCallback,
    private readonly debugDir?: string,
    retryConfig?: Partial<RetryConfig>
  ) {
    this.provider = createTranscriptionProvider(ctx, config)
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  }

  /**
   * Process a transcription task from the queue
   */
  @withContext('processTranscription')
  async processTask (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    task: TranscriptionQueueTask,
    control?: ConsumerControl
  ): Promise<void> {
    if (this.provider === undefined) {
      this.ctx.error('Transcription provider not available, skipping task', { blobId: task.blobId })
      return
    }

    const startTime = Date.now()

    try {
      // Get workspace storage info
      const wsInfo = await this.getWorkspaceStorage(workspace)
      if (wsInfo === undefined) {
        this.ctx.error('Failed to get workspace storage info', { workspace, blobId: task.blobId })
        await this.handlePermanentError(ctx, workspace, task, 'Workspace storage info not available')
        return
      }

      // Load gzipped WAV from storage
      const gzipData = await this.loadFromStorage(ctx, wsInfo.wsIds, task.blobId)
      if (gzipData === undefined) {
        // File not found - send to dead letter queue and log error
        const errorMsg = `Audio file not found in storage: ${task.blobId}`
        this.ctx.error(errorMsg, {
          workspace,
          blobId: task.blobId,
          participant: task.participant,
          roomName: task.roomName
        })
        await this.handlePermanentError(ctx, workspace, task, errorMsg, TranscriptionErrorType.FileNotFound)
        return
      }

      // Decompress gzip to WAV
      let wavData: Buffer
      try {
        wavData = await gunzip(gzipData)
      } catch (err: any) {
        const errorMsg = `Failed to decompress audio: ${err.message}`
        this.ctx.error(errorMsg, { workspace, blobId: task.blobId })
        await this.handlePermanentError(ctx, workspace, task, errorMsg)
        return
      }

      // Verify speech presence with VAD (don't trust task.hasSpeech)
      const vadResult = analyzeAudio(ctx, wavData, this.config.vadRmsThreshold, this.config.vadSpeechRatioThreshold)

      if (!vadResult.hasSpeech) {
        this.ctx.info('No speech detected by VAD, skipping transcription', {
          workspace,
          blobId: task.blobId,
          participant: task.participant,
          originalHasSpeech: task.hasSpeech,
          vadRms: vadResult.rmsAmplitude.toFixed(4),
          vadSpeechRatio: vadResult.speechRatio.toFixed(4)
        })
      }

      // Normalize audio before transcription
      const normalizedWavData = ctx.withSync('normalizeAudio', {}, () => normalizeAudio(wavData))

      // Transcribe audio with retry logic
      const result = await this.transcribeWithRetry(ctx, normalizedWavData, task, workspace, control)

      if (result === undefined) {
        // All retries exhausted, already handled in transcribeWithRetry
        return
      }

      ctx.info('Received transcription result', { result: result.text, language: result.language })

      if (result.text.trim() === '') {
        this.ctx.info('Empty transcription result', {
          workspace,
          blobId: task.blobId,
          participant: task.participant
        })
      }

      const finalText = result.text

      if (this.debugDir !== '' && this.debugDir != null) {
        // We need to store chunk and transcription to testing file.
        const blName = path.join(this.debugDir, workspace, task.participant, `${task.blobId}_${Date.now()}`)
        await writeFile(blName + '.wav', wavData)
        await writeFile(blName + '.json', JSON.stringify({ result, finalText }))
      }

      if (finalText.trim() === '') {
        this.ctx.info('Empty transcription after overlap correction', {
          workspace,
          blobId: task.blobId,
          participant: task.participant,
          originalText: result.text.substring(0, 100)
        })

        // Delete placeholder message if exists
        if (task.placeholderMessageId !== undefined) {
          await this.updateMessage(ctx, workspace, task.roomName, task.placeholderMessageId, null)
        }

        await this.cleanupStorage(wsInfo.wsIds, task.blobId)
        return
      }

      // Update placeholder message with transcription, or create new message if no placeholder
      if (task.placeholderMessageId !== undefined) {
        await this.updateMessage(ctx, workspace, task.roomName, task.placeholderMessageId, finalText)
      } else {
        // Fallback: send as new message (legacy behavior)
        await this.sendTranscript(
          ctx,
          workspace,
          task.roomName,
          task.participant,
          finalText,
          task.startTimeSec,
          task.endTimeSec
        )
      }

      const elapsed = Date.now() - startTime
      this.ctx.info('Transcription task completed', {
        workspace,
        blobId: task.blobId,
        participant: task.participant,
        textLength: finalText.length,
        durationSec: task.durationSec,
        elapsedMs: elapsed
      })

      // Cleanup storage
      await this.cleanupStorage(wsInfo.wsIds, task.blobId)
    } catch (err: any) {
      const elapsed = Date.now() - startTime
      this.ctx.error('Transcription task failed with unexpected error', {
        workspace,
        blobId: task.blobId,
        participant: task.participant,
        error: err.message,
        elapsedMs: elapsed
      })
      await this.handlePermanentError(ctx, workspace, task, err.message)
    }
  }

  /**
   * Transcribe audio with exponential backoff retry
   */
  private async transcribeWithRetry (
    ctx: MeasureContext,
    audioData: Buffer,
    task: TranscriptionQueueTask,
    workspace: WorkspaceUuid,
    control?: ConsumerControl
  ): Promise<{ text: string, language?: string } | undefined> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await ctx.with('transcribe', {}, () =>
          this.provider.transcribe(audioData, {
            wordTimestamps: true,
            sampleRate: task.sampleRate,
            channels: task.channels
          })
        )
        return result
      } catch (err: any) {
        lastError = err
        const errorType = classifyError(err)

        this.ctx.warn('Transcription attempt failed', {
          workspace,
          blobId: task.blobId,
          attempt: attempt + 1,
          maxRetries: this.retryConfig.maxRetries,
          errorType,
          error: err.message
        })

        // Don't retry permanent errors
        if (errorType === TranscriptionErrorType.PermanentError) {
          this.ctx.error('Permanent transcription error, not retrying', {
            workspace,
            blobId: task.blobId,
            error: err.message
          })
          await this.handlePermanentError(ctx, workspace, task, err.message, errorType)
          return undefined
        }

        // Check if we have more retries
        if (attempt < this.retryConfig.maxRetries) {
          const delay = calculateBackoffDelay(attempt, this.retryConfig)

          this.ctx.info('Waiting before retry with exponential backoff', {
            workspace,
            blobId: task.blobId,
            attempt: attempt + 1,
            nextAttempt: attempt + 2,
            delayMs: delay
          })

          // Send heartbeats during the wait to keep the queue healthy
          await this.waitWithHeartbeat(delay, control)
        }
      }
    }

    // All retries exhausted
    this.ctx.error('All transcription retries exhausted', {
      workspace,
      blobId: task.blobId,
      maxRetries: this.retryConfig.maxRetries,
      lastError: lastError?.message
    })

    await this.handlePermanentError(
      ctx,
      workspace,
      task,
      `All retries exhausted after ${this.retryConfig.maxRetries} attempts: ${lastError?.message}`,
      TranscriptionErrorType.ServiceUnavailable
    )

    return undefined
  }

  /**
   * Wait for a given delay while sending periodic heartbeats
   */
  private async waitWithHeartbeat (delayMs: number, control?: ConsumerControl): Promise<void> {
    const heartbeatInterval = 1000 // Send heartbeat every second
    let elapsed = 0

    while (elapsed < delayMs) {
      const waitTime = Math.min(heartbeatInterval, delayMs - elapsed)
      await sleep(waitTime)
      elapsed += waitTime

      // Send heartbeat to keep the queue connection healthy
      if (control !== undefined) {
        try {
          await control.heartbeat()
        } catch (err: any) {
          this.ctx.warn('Failed to send heartbeat during retry wait', { error: err.message })
        }
      }
    }
  }

  /**
   * Handle permanent error by sending to dead letter queue
   */
  private async handlePermanentError (
    ctx: MeasureContext,
    workspace: WorkspaceUuid,
    task: TranscriptionQueueTask,
    errorMessage: string,
    errorType: string = TranscriptionErrorType.PermanentError
  ): Promise<void> {
    // Delete placeholder message if exists
    if (task.placeholderMessageId !== undefined) {
      try {
        await this.updateMessage(ctx, workspace, task.roomName, task.placeholderMessageId, null)
      } catch (err: any) {
        this.ctx.warn('Failed to delete placeholder message on error', {
          workspace,
          messageId: task.placeholderMessageId,
          error: err.message
        })
      }
    }

    // Send to dead letter queue if callback is provided
    if (this.sendToDeadLetter !== undefined) {
      try {
        await this.sendToDeadLetter(ctx, workspace, task, errorMessage, errorType)
        this.ctx.info('Task sent to dead letter queue', {
          workspace,
          blobId: task.blobId,
          errorType,
          error: errorMessage
        })
      } catch (err: any) {
        this.ctx.error('Failed to send task to dead letter queue', {
          workspace,
          blobId: task.blobId,
          error: err.message
        })
      }
    }
  }

  /**
   * Load blob from storage
   */
  @withContext('loadFromStorage')
  private async loadFromStorage (ctx: MeasureContext, wsIds: WorkspaceIds, blobId: string): Promise<Buffer | undefined> {
    try {
      return Buffer.concat(await this.storageAdapter.read(ctx, wsIds, blobId))
    } catch (err: any) {
      this.ctx.error('Storage read error', { blobId, error: err.message })
      return undefined
    }
  }

  /**
   * Remove blob from storage after processing
   */
  private async cleanupStorage (wsIds: WorkspaceIds, blobId: string): Promise<void> {
    try {
      await this.storageAdapter.remove(this.ctx, wsIds, [blobId])
    } catch (err: any) {
      this.ctx.error('Storage cleanup error', { blobId, error: err.message })
    }
  }

  /**
   * Get provider name for monitoring
   */
  getProviderName (): string {
    return this.provider?.name ?? 'none'
  }

  /**
   * Check if consumer is ready
   */
  isReady (): boolean {
    return this.provider !== undefined
  }
}

/**
 * Create transcription consumer instance
 */
export function createTranscriptionConsumer (
  ctx: MeasureContext,
  config: TranscriptionConfig,
  storageAdapter: StorageAdapter,
  getWorkspaceStorage: GetWorkspaceStorageCallback,
  sendTranscript: TranscriptSendCallback,
  updateMessage: UpdateMessageCallback,
  sendToDeadLetter?: SendToDeadLetterCallback,
  debugDir?: string,
  retryConfig?: Partial<RetryConfig>
): TranscriptionConsumer {
  return new TranscriptionConsumer(
    ctx,
    config,
    storageAdapter,
    getWorkspaceStorage,
    sendTranscript,
    updateMessage,
    sendToDeadLetter,
    debugDir,
    retryConfig
  )
}
