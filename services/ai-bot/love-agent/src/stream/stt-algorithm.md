# STT Audio Chunking Algorithm

Документация по алгоритму разбиения аудиопотока на чанки для транскрибирования.

## Обзор

Модуль `stt.ts` реализует интеллектуальное разбиение аудиопотока на отдельные чанки (фрагменты) для последующей транскрибации. Алгоритм использует **адаптивный Voice Activity Detection (VAD)** с мульти-критериальным анализом для точного определения границ фраз.

## Ключевые константы

| Константа | Значение | Описание |
|-----------|----------|----------|
| `MAX_CHUNK_DURATION_MS` | 30000 мс | Максимальная длительность чанка (30 секунд) |
| `MIN_CHUNK_DURATION_MS` | 500 мс | Минимальная длительность чанка (0.5 секунды) |
| `SILENCE_THRESHOLD_MIN_MS` | 400 мс | Минимальный порог тишины (быстрая речь) |
| `SILENCE_THRESHOLD_DEFAULT_MS` | 600 мс | Порог тишины по умолчанию |
| `SILENCE_THRESHOLD_MAX_MS` | 1000 мс | Максимальный порог тишины (медленная речь) |
| `SPEECH_START_THRESHOLD_MS` | 100 мс | Порог начала речи (100 мс активного звука) |
| `LOOK_AHEAD_BUFFER_MS` | 200 мс | Окно просмотра вперёд для поиска точек разреза |
| `VAD_THRESHOLD_DEFAULT` | 0.015 | Порог RMS по умолчанию для голосовой активности |
| `VAD_FRAME_THRESHOLD` | 0.01 | Порог амплитуды для отдельного сэмпла |
| `SPEECH_RATIO_THRESHOLD` | 0.1 | Минимум 10% активных сэмплов для определения речи |
| `WRITE_BUFFER_SIZE` | 4096 байт | Размер буфера записи (4KB) |

### Константы адаптивного VAD

| Константа | Значение | Описание |
|-----------|----------|----------|
| `NOISE_FLOOR_ADAPTATION_RATE` | 0.05 | Скорость адаптации шумового порога |
| `NOISE_FLOOR_INITIAL` | 0.01 | Начальная оценка шумового порога |
| `NOISE_FLOOR_MIN` | 0.005 | Минимальный шумовой порог |
| `NOISE_FLOOR_MAX` | 0.1 | Максимальный шумовой порог (шумная среда) |
| `VAD_MARGIN_ABOVE_NOISE` | 2.0 | Множитель для VAD порога над шумом |

### Константы определения темпа речи

| Константа | Значение | Описание |
|-----------|----------|----------|
| `SPEECH_RATE_WINDOW_MS` | 5000 мс | Окно для расчёта темпа речи |
| `FAST_SPEECH_THRESHOLD` | 0.7 | Порог быстрой речи (>70% активности) |
| `SLOW_SPEECH_THRESHOLD` | 0.3 | Порог медленной речи (<30% активности) |

### Частотные диапазоны

| Константа | Значение | Описание |
|-----------|----------|----------|
| `SPEECH_BAND_LOW` | 300 Гц | Нижняя граница речевого диапазона |
| `SPEECH_BAND_HIGH` | 3400 Гц | Верхняя граница речевого диапазона |
| `HIGH_BAND_LOW` | 3400 Гц | Нижняя граница высоких частот |
| `HIGH_BAND_HIGH` | 8000 Гц | Верхняя граница (Nyquist для 16 кГц) |
| `SPEECH_CENTROID_MIN` | 400 Гц | Минимальный центроид для речи |
| `SPEECH_CENTROID_MAX` | 3000 Гц | Максимальный центроид для речи |

## Формат аудио

- Sample Rate: 16000 Hz
- Channels: 1 (моно)
- Bits per Sample: 16 (PCM)

## Структуры данных

### AudioAnalysis — результат анализа аудио фрейма

```
AudioAnalysis {
  rms: number               // Root Mean Square (0-1)
  peak: number              // Пиковая амплитуда (0-1)
  activeSamples: number     // Число активных сэмплов
  totalSamples: number      // Общее число сэмплов
  sumSquares: number        // Сумма квадратов (для RMS)
  
  // Расширенные метрики
  zeroCrossingRate: number  // Частота пересечения нуля (речь: 0.05-0.5)
  lowBandEnergy: number     // Энергия в речевом диапазоне (300-3400 Гц)
  highBandEnergy: number    // Энергия в высоких частотах (3400-8000 Гц)
  spectralCentroid: number  // Центр масс спектра (Гц)
  spectralFlux: number      // Изменение спектра (детекция начала)
  spectrum: Float32Array    // Спектр для расчёта flux
}
```

### AdaptiveVADState — состояние адаптивного VAD

```
AdaptiveVADState {
  // Оценка шумового порога
  noiseFloor: number              // Текущий шумовой порог (RMS)
  noiseFloorSamples: number       // Число сэмплов для калибровки
  
  // Отслеживание темпа речи
  recentSpeechHistory: Array<{    // История недавних фреймов
    time: number,
    hasSpeech: boolean,
    durationMs: number
  }>
  currentSpeechRate: number       // Текущий темп речи (0-1)
  
  // Адаптивный порог тишины
  adaptiveSilenceThresholdMs: number  // 400-1000 мс
  
  // Спектральный анализ
  previousFrameSpectrum: Float32Array | null
  
  // Look-ahead буфер
  lookAheadBuffer: LookAheadFrame[]
  lookAheadDurationMs: number
}
```

### ChunkState — состояние текущего чанка

```
ChunkState {
  fd: number | null           // Файловый дескриптор
  chunkStartTime: number      // Начало чанка (абсолютное время в мс)
  chunkEndTime: number        // Конец чанка (абсолютное время в мс)
  chunkDataLength: number     // Длина данных в байтах
  chunkFilePath: string       // Путь к файлу чанка
  
  // VAD метрики
  totalSamples: number        // Общее число сэмплов
  activeSamples: number       // Число активных сэмплов (выше порога)
  peakAmplitude: number       // Пиковая амплитуда
  sumSquares: number          // Сумма квадратов (для RMS)
  
  // VAD состояние
  isSpeaking: boolean         // Говорит ли пользователь сейчас
  speechStartTime: number     // Когда началась текущая речь
  silenceStartTime: number    // Когда началась тишина
  lastSpeechEndTime: number   // Когда закончилась последняя речь
  consecutiveSpeechMs: number // Непрерывная речь (мс)
  consecutiveSilenceMs: number// Непрерывная тишина (мс)
  chunkIndex: number          // Индекс чанка
  
  // Pre-buffer для захвата начала речи
  preBuffer: PreBufferFrame[] // Кольцевой буфер недавних фреймов
  preBufferDurationMs: number // Суммарная длительность фреймов в буфере
  
  // Адаптивный VAD
  adaptiveVAD: AdaptiveVADState
}
```

## Pre-Buffer (Кольцевой буфер)

Для предотвращения потери начальных миллисекунд речи используется **pre-buffer** — кольцевой буфер, хранящий последние ~200мс аудио.

### Принцип работы

```
┌─────────────────────────────────────────────────────────────────┐
│  Pre-buffer (когда fd = null, чанк не записывается)            │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐             │
│  │ F1  │ F2  │ F3  │ F4  │ F5  │ F6  │ F7  │ F8  │ ← новые     │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘             │
│    ↑                                                            │
│    старые фреймы удаляются, когда буфер > 200мс                │
└─────────────────────────────────────────────────────────────────┘
```

1. **Накопление**: пока чанк не записывается (`fd = null`), все фреймы добавляются в pre-buffer
2. **Ограничение размера**: буфер автоматически обрезается до ~200мс (2 × SPEECH_START_THRESHOLD_MS)
3. **Запись при старте речи**: когда обнаруживается начало речи (100мс), сначала записываются фреймы из pre-buffer, затем текущий фрейм
4. **Очистка**: после записи pre-buffer очищается

### Зачем нужен pre-buffer

Без pre-buffer терялись бы первые ~100мс каждой фразы:
- VAD требует 100мс непрерывной речи для подтверждения начала фразы
- За это время накапливается 5-10 фреймов аудио
- Эти фреймы содержат начало слова/фразы
- Без буфера они теряются, т.к. чанк ещё не создан

## Мульти-критериальный VAD

### Анализ аудио фрейма

Для каждого входящего аудио фрейма выполняется расширенный анализ:

```
analyzeAudioBuffer(buf, sampleRate, previousSpectrum):
  1. Базовые метрики:
     - RMS (Root Mean Square)
     - Пиковая амплитуда
     - Активные сэмплы (выше порога)
     - Zero-crossing rate
  
  2. Спектральный анализ (DFT):
     - Энергия в речевом диапазоне (300-3400 Гц)
     - Энергия в высоких частотах (3400-8000 Гц)
     - Спектральный центроид
  
  3. Временной анализ:
     - Spectral flux (изменение спектра)
```

### Критерии определения речи

Фрейм считается содержащим речь, если выполняется **любое из условий**:

```
isFrameSpeech(analysis, adaptiveVAD):
  
  // Получаем адаптивный порог
  vadThreshold = noiseFloor × VAD_MARGIN_ABOVE_NOISE
  
  // 1. Первичные критерии (быстрый отклик)
  rmsAboveThreshold = rms > vadThreshold
  sufficientActivity = speechRatio > 0.1
  
  // 2. Вторичные критерии (спектральные)
  zcrInSpeechRange = zeroCrossingRate ∈ [0.05, 0.5]
  speechBandDominant = lowBandEnergy > 0.3
  centroidInSpeechRange = spectralCentroid ∈ [400, 3000] Гц
  lowHighBandRatio = lowBandEnergy > highBandEnergy × 1.5
  
  // 3. Третичные критерии (начало речи)
  hasSpectralOnset = spectralFlux > 0.01
  
  // Комбинированное решение
  primaryCriteria = rmsAboveThreshold OR sufficientActivity
  
  spectralFeatureCount = count(zcrInSpeechRange, speechBandDominant,
                               centroidInSpeechRange, lowHighBandRatio)
  secondaryCriteria = spectralFeatureCount >= 3 AND rms > vadThreshold × 0.5
  
  tertiaryCriteria = hasSpectralOnset AND rms > vadThreshold × 0.7 
                     AND centroidInSpeechRange
  
  RETURN primaryCriteria OR secondaryCriteria OR tertiaryCriteria
```

## Адаптивные пороги

### Адаптация к шуму

Система автоматически калибруется под уровень фонового шума:

```
updateNoiseFloor(state, rms, isSpeech):
  IF NOT isSpeech AND rms > 0:
    IF noiseFloorSamples < 50:
      // Начальная калибровка — простое среднее
      noiseFloor = (noiseFloor × samples + rms) / (samples + 1)
      samples++
    ELSE:
      // EMA для постоянной адаптации
      noiseFloor = noiseFloor × 0.95 + rms × 0.05
    
    // Ограничение диапазона
    noiseFloor = clamp(noiseFloor, 0.005, 0.1)
```

### Адаптация к темпу речи

Порог тишины адаптируется в зависимости от скорости речи:

```
updateSpeechRate(state, currentTime, hasSpeech, frameDurationMs):
  // Обновляем историю (окно 5 секунд)
  recentSpeechHistory.push({time, hasSpeech, durationMs})
  recentSpeechHistory.filter(entry => entry.time >= currentTime - 5000)
  
  // Вычисляем долю речи
  speechRate = speechMs / totalMs
  
  // Адаптируем порог тишины
  IF speechRate > 0.7:     // Быстрая речь
    adaptiveSilenceThresholdMs = 400
  ELSE IF speechRate < 0.3: // Медленная речь
    adaptiveSilenceThresholdMs = 1000
  ELSE:                     // Интерполяция
    ratio = (speechRate - 0.3) / 0.4
    adaptiveSilenceThresholdMs = 1000 - ratio × 600
```

## Look-Ahead буфер и оптимальные точки разреза

### Проблема

При достижении максимальной длительности чанка (30 сек) нужно найти оптимальную точку для разреза, чтобы не разрывать слово или фразу.

### Решение

За 200мс до максимума начинаем накапливать фреймы в look-ahead буфер и ищем лучшую точку разреза:

```
┌───────────────────────────────────────────────────────────────┐
│                    Чанк (30 секунд)                           │
├─────────────────────────────────────────┬────────────────────┤
│              Основная часть             │  Look-ahead 200ms  │
│                                         │  ┌──┬──┬──┬──┬──┐  │
│                                         │  │F1│F2│F3│F4│F5│  │
│                                         │  └──┴──┴──┴──┴──┘  │
│                                         │       ↑            │
│                                         │  Лучшая точка      │
└─────────────────────────────────────────┴────────────────────┘
```

### Алгоритм поиска оптимальной точки

```
findOptimalCutPoint(lookAheadBuffer, minSilenceMs = 50):
  candidates = []
  
  // 1. Ищем все паузы >= 50мс
  FOR each silenceGap IN buffer:
    IF silenceGap.duration >= minSilenceMs:
      score = scoreCutPoint(buffer, silenceGap.startIndex, silenceGap.duration)
      candidates.push({index, score})
  
  // 2. Если пауз нет, ищем провалы энергии
  IF candidates.empty:
    FOR i IN [1, buffer.length - 1]:
      IF rms[i] < rms[i-1] AND rms[i] < rms[i+1]:  // Локальный минимум
        IF rms[i] < avgRms × 0.5:
          RETURN i
    RETURN -1
  
  // 3. Возвращаем точку с максимальным score
  RETURN candidates.sortByScoreDesc()[0].index
```

### Система скоринга точек разреза

```
scoreCutPoint(buffer, cutIndex, silenceDurationMs):
  score = 0
  frame = buffer[cutIndex]
  
  // 1. Длительность паузы (0-40 баллов)
  score += min(40, silenceDurationMs / 5)  // Макс при 200мс
  
  // 2. Падение энергии (0-20 баллов)
  IF cutIndex > 0:
    energyDrop = buffer[cutIndex - 1].rms - frame.rms
    score += min(20, energyDrop × 200)
  
  // 3. Низкий RMS в точке разреза (0-15 баллов)
  score += max(0, 15 - frame.rms × 150)
  
  // 4. Низкий spectral flux (0-15 баллов)
  // Низкий flux = стабильная точка
  score += max(0, 15 - frame.spectralFlux × 500)
  
  // 5. Центроид вне речевого диапазона (0-10 баллов)
  IF centroid < 400 OR centroid > 3000:
    score += 10  // Вероятно пауза
  ELSE:
    score -= 5   // Штраф за разрез в середине речи
  
  // 6. Позиция в буфере (0-10 баллов)
  // Предпочитаем не самое начало и не конец
  positionRatio = cutIndex / buffer.length
  IF positionRatio ∈ [0.2, 0.8]:
    score += 10
  ELSE IF positionRatio ∈ [0.1, 0.9]:
    score += 5
  
  RETURN score
```

## Алгоритм чанкования

### Общая схема

```
┌─────────────────────────────────────────────────────────────────┐
│                      Аудио поток                                │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Для каждого фрейма:                                            │
│  1. Расширенный анализ (RMS, ZCR, спектр, flux)                │
│  2. Адаптация порогов (шум, темп речи)                         │
│  3. Мульти-критериальный VAD                                    │
│  4. Обновление состояния (речь/тишина)                         │
│  5. Принятие решения о чанке                                   │
└─────────────────────────────────────────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
      ┌───────────┐    ┌───────────┐    ┌───────────┐
      │  Начать   │    │ Завершить │    │  Записать │
      │  чанк     │    │   чанк    │    │  в чанк   │
      │+ pre-buf  │    │+ look-ahd │    │           │
      └───────────┘    └───────────┘    └───────────┘
```

### Детальный алгоритм

#### 0. Добавление в Pre-Buffer

```
IF fd == null:
    preBuffer.push({buf, analysis, frameStartTime, frameEndTime, hasSpeech})
    preBufferDurationMs += frameDurationMs
    
    // Обрезаем буфер до ~200мс
    WHILE preBufferDurationMs > 200ms AND preBuffer.length > 1:
        removed = preBuffer.shift()
        preBufferDurationMs -= removed.duration
```

#### 1. Обновление адаптивного состояния

```
// Обновляем шумовой порог (только во время тишины)
updateNoiseFloor(adaptiveVAD, rms, !frameHasSpeech)

// Обновляем темп речи и адаптивный порог тишины
updateSpeechRate(adaptiveVAD, frameEndTime, frameHasSpeech, frameDurationMs)

// Сохраняем спектр для следующего фрейма
adaptiveVAD.previousFrameSpectrum = analysis.spectrum
```

#### 2. Обработка фрейма с речью

```
IF frameHasSpeech:
    consecutiveSpeechMs += frameDurationMs
    consecutiveSilenceMs = 0
    lastSpeechEndTime = frameEndTime
    
    IF NOT isSpeaking AND consecutiveSpeechMs >= 100ms:
        isSpeaking = true
        speechStartTime = frameStartTime - consecutiveSpeechMs
        
        IF fd == null:
            startNewChunk()
            
            // Записываем фреймы из pre-buffer начиная с speechStartTime
            FOR frame IN preBuffer:
                IF frame.frameEndTime >= speechStartTime:
                    writeToChunk(frame.buf)
                    updateVADMetrics(frame.analysis)
                    
            preBuffer = []  // Очищаем буфер
```

#### 3. Обработка фрейма с тишиной

```
IF NOT frameHasSpeech:
    consecutiveSilenceMs += frameDurationMs
    consecutiveSpeechMs = 0
    
    // Используем адаптивный порог!
    IF isSpeaking AND consecutiveSilenceMs >= adaptiveSilenceThresholdMs:
        isSpeaking = false
        
        IF fd != null:
            chunkEndTime = lastSpeechEndTime  // Обрезаем trailing silence
            finalizeChunk(reason: 'silence')
```

#### 4. Проверка максимальной длительности с look-ahead

```
IF fd != null:
    currentDuration = frameEndTime - chunkStartTime
    
    // Накапливаем look-ahead буфер при приближении к максимуму
    IF currentDuration >= MAX_CHUNK_DURATION_MS - 200ms:
        lookAheadBuffer.push(frame)
    
    IF currentDuration >= MAX_CHUNK_DURATION_MS:
        // Ищем оптимальную точку разреза
        cutIndex = findOptimalCutPoint(lookAheadBuffer, 50ms)
        
        IF cutIndex >= 0:
            // Записываем фреймы до точки разреза
            FOR i IN [0, cutIndex):
                writeToChunk(lookAheadBuffer[i])
            
            finalizeChunk(reason: 'max_duration')
            
            IF isSpeaking:
                // Переносим оставшиеся фреймы в новый чанк
                startNewChunk()
                FOR frame IN lookAheadBuffer[cutIndex:]:
                    writeToChunk(frame)
        ELSE:
            // Нет хорошей точки — режем как есть
            finalizeChunk(reason: 'max_duration')
            IF isSpeaking:
                startNewChunk()
        
        lookAheadBuffer = []
```

### Диаграмма состояний

```
                    ┌──────────────────┐
                    │   ОЖИДАНИЕ       │
                    │  (fd = null)     │
                    │  (isSpeaking     │
                    │   = false)       │
                    │  [pre-buffer     │
                    │   накапливает    │
                    │   фреймы]        │
                    │  [адаптация к    │
                    │   шуму]          │
                    └────────┬─────────┘
                             │
                             │ 100ms непрерывной речи
                             │ + запись pre-buffer
                             ▼
                    ┌──────────────────┐
                    │   ЗАПИСЬ         │
                    │  (fd != null)    │◄─────────────────┐
                    │  (isSpeaking     │                  │
                    │   = true)        │                  │
                    │  [адаптация к    │                  │
                    │   темпу речи]    │                  │
                    │  [pre-buffer     │                  │
                    │   очищен]        │                  │
                    └────────┬─────────┘                  │
                             │                            │
        ┌────────────────────┼────────────────────┐       │
        │                    │                    │       │
        ▼                    ▼                    │       │
┌───────────────┐   ┌───────────────┐            │       │
│ 400-1000мс    │   │ 30 сек макс   │            │       │
│ тишины        │   │ + look-ahead  │            │       │
│ (адаптивно)   │   │ (оптимальный  │            │       │
│ (SILENCE)     │   │  разрез)      │            │       │
└───────┬───────┘   └───────┬───────┘            │       │
        │                   │                    │       │
        │                   │ речь продолжается  │       │
        │                   └────────────────────┘       │
        │                                                │
        │ finalizeChunk()                                │
        ▼                                                │
┌──────────────────┐                                     │
│   ОЖИДАНИЕ       │                                     │
│  (fd = null)     │─────────────────────────────────────┘
│  [pre-buffer     │   100ms новой речи
│   снова          │
│   накапливает]   │
└──────────────────┘
```

## Причины завершения чанка

| Причина | Код | Описание |
|---------|-----|----------|
| Тишина | `silence` | 400-1000мс тишины после речи (адаптивно) |
| Максимальная длительность | `max_duration` | Достигнут лимит 30 секунд (с оптимальным разрезом) |
| Конец потока | `stream_end` | Участник отключился |

## Финализация чанка

При завершении чанка (`finalizeChunk`):

1. **Проверка минимальной длительности** — чанки короче 500мс пропускаются (кроме `stream_end`)
2. **Сброс буфера записи** на диск
3. **Обновление WAV заголовка** с корректной длиной данных
4. **Расчёт метрик**:
   - `startTimeSec` / `endTimeSec` — относительно начала митинга
   - `rmsAmplitude` — средняя громкость
   - `speechRatio` — доля активных сэмплов
5. **Сжатие gzip** и отправка на платформу
6. **Удаление локального файла** (если не debug режим)
7. **Сброс состояния** для следующего чанка

## Параллельная запись сессии

Помимо чанков, весь аудио поток также записывается в **полную сессию**:

- Формат: WAV → Opus (конвертация через ffmpeg, 16kbps VBR, оптимально для 16kHz речи)
- Одна сессия на участника за период записи
- Используется для прикрепления аудио к митингу

## Буферизация записи

Для оптимизации I/O операций используется буфер размером 4KB:

```
writeToChunk(data):
    WHILE dataOffset < data.length:
        bytesToCopy = min(bufferSpace, remainingData)
        copy(data → writeBuffer)
        
        IF buffer is full:
            writeSync(fd, writeBuffer)
            reset buffer
```

## Пример работы алгоритма

```
Время:  0s    1s    2s    3s    4s    5s    6s    7s    8s
        ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼     ▼
Аудио:  ░░░░░░████████████████░░░░░░████████░░░░░░░░░░░░
              ▲                ▲      ▲      ▲
              │                │      │      │
          Начало речи    400-1000мс  Начало  400-1000мс
          (VAD: 100ms)   тишины     речи    тишины
          + pre-buffer   (адаптив.) (VAD)   (адаптив.)
          → startNewChunk → fin.   + pre-buf → finalize
                            ch.0   → start    chunk 1
                                    chunk 1

Детально для первой фразы:
├─ 0.9s-1.0s: речь в pre-buffer (накопление 100ms для VAD)
├─ 1.0s: VAD подтверждает речь → создаём чанк
├─      → записываем pre-buffer (0.9s-1.0s) в чанк
├─      → продолжаем запись текущего аудио
├─ 3.0s: речь закончилась
├─      → система определяет темп речи ~60% → порог = 550мс
└─ 3.55s: 550мс тишины → финализируем чанк

Результат:
- Чанк 0: ~0.9s - ~3.0s (речь, включая начальные 100ms из pre-buffer)
- Чанк 1: ~4.9s - ~6.0s (речь, включая начальные 100ms из pre-buffer)
```

## Обработка граничных случаев

### Слишком короткие чанки
Чанки короче 500мс отбрасываются — это предотвращает отправку случайных шумов.

### Очень длинная речь без пауз
При достижении 30 секунд используется look-ahead буфер для поиска оптимальной точки разреза:
- Ищем паузы >= 50мс с максимальным score
- Если пауз нет, ищем локальные минимумы энергии
- В крайнем случае режем в текущей позиции

### Отключение участника
При отключении (`stream_end`) финализируются все активные чанки и сессия, даже если речь не была завершена паузой.

### Дубликаты фреймов
Для сессионной записи вычисляется простой хэш фрейма для обнаружения потенциальных дубликатов (логирование warning).

### Потеря начала фразы (решено с pre-buffer)
Ранее первые ~100мс каждой фразы терялись, т.к. VAD требует время для подтверждения речи. Теперь pre-buffer сохраняет последние ~200мс аудио, и при старте чанка эти данные записываются первыми.

### Шумная среда
Адаптивный VAD автоматически калибруется под уровень фонового шума, повышая порог обнаружения речи для избежания ложных срабатываний.

### Разная скорость речи
- Быстрая речь (>70% активности): порог тишины 400мс
- Медленная речь (<30% активности): порог тишины 1000мс
- Нормальная речь: интерполяция между 400-1000мс
