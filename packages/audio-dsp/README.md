# @hcengineering/audio-dsp

Audio Digital Signal Processing library for Huly platform.

## Features

- **WAV file handling** - Parsing, creating, and header manipulation
- **FFT/IFFT operations** - Fast Fourier Transform for spectral analysis using Cooley-Tukey algorithm
- **Audio analysis** - Voice Activity Detection (VAD), RMS, spectral features
- **Noise reduction** - Spectral subtraction algorithm for background noise removal
- **Audio normalization** - Level normalization and gain control

## Installation

```bash
rush add -p @hcengineering/audio-dsp
```

## Usage

### WAV File Operations

```typescript
import { parseWavHeader, createWavFile, extractWavSamples } from '@hcengineering/audio-dsp'

// Parse WAV header
const header = parseWavHeader(wavData)
console.log(`Sample rate: ${header.sampleRate}Hz, Channels: ${header.channels}`)

// Extract samples
const samples = extractWavSamples(wavData)

// Create WAV file from samples
const wavFile = createWavFile(samples, 16000, 1)
```

### Noise Reduction

```typescript
import { reduceNoise, NoiseReducer } from '@hcengineering/audio-dsp'

// Simple usage
const denoisedSamples = reduceNoise(samples, sampleRate, {
  frameSize: 512,
  overSubtractionFactor: 2.0,
  spectralFloor: 0.02
})

// Advanced usage with NoiseReducer class
const reducer = new NoiseReducer({
  frameSize: 512,
  hopSize: 256,
  noiseEstimationFrames: 20,
  overSubtractionFactor: 2.0,
  spectralFloor: 0.02,
  adaptiveNoiseEstimation: true
})

const result = reducer.process(samples, sampleRate)
console.log(`Processed ${result.framesProcessed} frames`)
console.log(`Average reduction: ${result.stats.averageReductionDb} dB`)
```

### Voice Activity Detection

```typescript
import { detectVoiceActivity, analyzeAudio, isFrameSpeech } from '@hcengineering/audio-dsp'

// Simple VAD
const vadResult = detectVoiceActivity(samples, 0.02, 0.1)
if (vadResult.hasSpeech) {
  console.log(`Speech detected, RMS: ${vadResult.rmsAmplitude}`)
}

// Detailed audio analysis
const analysis = analyzeAudio(samples, sampleRate)
console.log(`RMS: ${analysis.rms}, Peak: ${analysis.peak}`)
console.log(`Spectral centroid: ${analysis.spectralCentroid}Hz`)
console.log(`Zero-crossing rate: ${analysis.zeroCrossingRate}`)

// Advanced speech detection with spectral features
const hasSpeech = isFrameSpeech(analysis, 0.02, 0.1)
```

### FFT Operations

```typescript
import { fft, ifft, stft, istft, createHannWindow } from '@hcengineering/audio-dsp'

// Forward FFT
const { real, imag } = fft(samples)

// Inverse FFT
const reconstructed = ifft(real, imag)

// Short-Time Fourier Transform
const window = createHannWindow(512)
const frames = stft(samples, 512, 256, window)

// Inverse STFT
const output = istft(frames, 512, 256, window)
```

### Audio Normalization

```typescript
import { normalizeAudio, getAudioStats, applyGain } from '@hcengineering/audio-dsp'

// Get audio statistics
const stats = getAudioStats(samples)
console.log(`RMS: ${stats.rms}, Peak: ${stats.peak}`)
console.log(`Suggested scaling: ${stats.suggestedScaling}`)

// Normalize audio
const normalized = normalizeAudio(samples, {
  targetRms: 0.2,
  targetPeak: 0.95
})

// Apply gain
const louder = applyGain(samples, 6) // +6 dB
```

## API Reference

### WAV Module

- `parseWavHeader(data)` - Parse WAV file header
- `createWavHeader(dataLength, sampleRate, channels, bitsPerSample)` - Create WAV header
- `createWavFile(samples, sampleRate, channels)` - Create complete WAV file
- `extractWavSamples(data)` - Extract PCM samples from WAV
- `getWavDuration(data)` - Get audio duration in seconds

### FFT Module

- `fft(input)` - Compute FFT of real-valued input
- `ifft(real, imag)` - Compute inverse FFT
- `stft(samples, frameSize, hopSize, window)` - Short-Time Fourier Transform
- `istft(frames, frameSize, hopSize, window)` - Inverse STFT
- `createHannWindow(size)` - Create Hann window
- `createHammingWindow(size)` - Create Hamming window
- `createBlackmanWindow(size)` - Create Blackman window

### Analysis Module

- `analyzeAudio(samples, sampleRate, previousSpectrum)` - Full audio analysis
- `detectVoiceActivity(samples, rmsThreshold, speechRatioThreshold)` - Simple VAD
- `isFrameSpeech(analysis, rmsThreshold, speechRatioThreshold)` - Advanced speech detection
- `calculateRms(samples)` - Calculate RMS amplitude
- `calculatePeak(samples)` - Calculate peak amplitude
- `calculateZeroCrossingRate(samples)` - Calculate zero-crossing rate

### Noise Reduction Module

- `NoiseReducer` - Class for noise reduction processing
- `reduceNoise(samples, sampleRate, config)` - Simple noise reduction
- `reduceNoiseFromWav(wavData, config)` - Process WAV file directly
- `estimateNoiseSpectrum(samples, sampleRate, frameSize)` - Estimate noise profile

### Normalize Module

- `normalizeAudio(samples, config)` - Normalize audio levels
- `getAudioStats(samples, config)` - Get audio statistics
- `applyGain(samples, gainDb)` - Apply gain in dB
- `peakLimit(samples, threshold, ratio)` - Apply peak limiting

## Algorithm Details

### Noise Reduction (Spectral Subtraction)

The noise reduction uses spectral subtraction with the following process:

1. **Noise Estimation**: Estimate noise spectrum from initial frames (assumed to be silence/noise)
2. **Spectral Subtraction**: For each frame:
   - Apply windowing and compute FFT
   - Subtract estimated noise spectrum with over-subtraction factor
   - Apply spectral floor to prevent negative values (musical noise artifacts)
   - Compute IFFT
3. **Overlap-Add**: Reconstruct signal using overlap-add synthesis

Key parameters:
- `overSubtractionFactor`: Controls aggressiveness (1.0-4.0, default: 2.0)
- `spectralFloor`: Prevents artifacts (0.01-0.1, default: 0.02)
- `noiseEstimationFrames`: Number of initial frames for noise estimation (default: 20)

## License

Eclipse Public License 2.0
