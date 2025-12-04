//
// Copyright © 2025 Andrey Sobolev (haiodo@gmail.com)
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * WAV file utilities for audio recording
 * Provides functions for creating and updating WAV headers
 */

import { writeSync } from 'fs'
import { spawn } from 'child_process'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { createWavHeader as createWavHeaderDsp } from '@hcengineering/audio-dsp'

/**
 * Creates a WAV file header for PCM audio data
 *
 * @param dataLength - Size of audio data in bytes
 * @param sampleRate - Sample rate in Hz (e.g., 16000)
 * @param channels - Number of channels (1 for mono, 2 for stereo)
 * @param bitsPerSample - Bits per sample (typically 16)
 * @returns Buffer containing 44-byte WAV header
 */
export function createWavHeader (
  dataLength: number,
  sampleRate: number,
  channels: number,
  bitsPerSample: number
): Buffer {
  // Use audio-dsp library for WAV header creation
  const headerArray = createWavHeaderDsp(dataLength, sampleRate, channels, bitsPerSample)
  return Buffer.from(headerArray)
}

/**
 * Updates WAV header with correct data length in-place in a file
 *
 * @param fd - File descriptor of the WAV file
 * @param dataLength - New data length in bytes
 */
export function updateWavHeader (fd: number, dataLength: number): void {
  const fileSizeBuffer = Buffer.alloc(4)
  const dataSizeBuffer = Buffer.alloc(4)

  // Update RIFF chunk size at offset 4
  fileSizeBuffer.writeUInt32LE(36 + dataLength, 0)
  writeSync(fd, fileSizeBuffer, 0, 4, 4)

  // Update data chunk size at offset 40
  dataSizeBuffer.writeUInt32LE(dataLength, 0)
  writeSync(fd, dataSizeBuffer, 0, 4, 40)
}

/**
 * Convert WAV file to OGG Opus using ffmpeg
 * OGG container with Opus codec is optimal for speech with excellent compression
 * and browser compatibility (pure .opus files don't play in most browsers)
 *
 * @param wavPath - Path to input WAV file
 * @param oggPath - Path for output OGG file
 * @returns Promise that resolves when conversion is complete
 */
export async function convertWavToOggOpus (wavPath: string, oggPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const ffmpegPath = ffmpegInstaller.path
    const args = [
      '-i',
      wavPath,
      '-codec:a',
      'libopus',
      '-b:a',
      '16k', // 16 kbps - optimal for 16kHz speech audio
      '-vbr',
      'on', // Variable bitrate for better quality
      '-compression_level',
      '10', // Maximum compression
      '-application',
      'voip', // Optimized for speech
      '-y', // Overwrite output
      oggPath
    ]

    const proc = spawn(ffmpegPath, args)

    let stderr = ''
    proc.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`))
      }
    })

    proc.on('error', (err) => {
      reject(new Error(`Failed to start ffmpeg: ${err.message}`))
    })
  })
}

/**
 * Sanitize a string for use in file paths
 * Replaces spaces and special characters with underscores
 *
 * @param name - String to sanitize
 * @returns Sanitized string safe for file paths
 */
export function sanitizePath (name: string): string {
  return name.replace(/\s+/g, '_').replace(/[<>:"/\\|?*,]/g, '_')
}
