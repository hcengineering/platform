#!/usr/bin/env node

/**
 * Benchmark script to measure memory usage and speed with different worker counts
 * for rush fast-build:validate
 *
 * Usage:
 *   node scripts/benchmark-workers.js [options]
 *
 * Options:
 *   --workers <list>    Comma-separated list of worker counts (default: 1,2,4,6,8,10,12)
 *   --runs <n>          Number of runs per worker count (default: 1)
 *   --skip-clean        Skip cleaning build outputs (use existing cache)
 *   --clean-validate    Only clean .validate dirs (keep lib/ for faster runs)
 *   --to <package>      Only benchmark specific package and its deps
 *   --help              Show help
 */

const { execSync, spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

const ROOT_DIR = path.resolve(__dirname, '..')
const COMPILE_ALL = path.join(ROOT_DIR, 'foundations/utils/packages/platform-rig/bin/compile_all.js')

// Default worker counts to test
const DEFAULT_WORKER_COUNTS = [1, 2, 4, 6, 8, 10, 12]

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    workerCounts: DEFAULT_WORKER_COUNTS,
    runs: 1,
    skipClean: false,
    cleanValidateOnly: false,
    toPackage: null,
    forceWorkers: false,
    help: false
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--workers' && args[i + 1]) {
      options.workerCounts = args[++i].split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n > 0)
    } else if (arg === '--runs' && args[i + 1]) {
      options.runs = parseInt(args[++i], 10) || 1
    } else if (arg === '--skip-clean') {
      options.skipClean = true
    } else if (arg === '--clean-validate') {
      options.cleanValidateOnly = true
    } else if (arg === '--to' && args[i + 1]) {
      options.toPackage = args[++i]
    } else if (arg === '--force-workers') {
      options.forceWorkers = true
    } else if (arg === '--help' || arg === '-h') {
      options.help = true
    }
  }

  return options
}

/**
 * Get cached rush list data
 */
let rushListCache = null
function getRushList() {
  if (rushListCache) return rushListCache

  const output = execSync('rush list --json', { cwd: ROOT_DIR, encoding: 'utf-8' })
  const jsonStart = output.indexOf('{')
  const jsonStr = output.slice(jsonStart)
  rushListCache = JSON.parse(jsonStr)
  return rushListCache
}

/**
 * Clean all build outputs to ensure fair comparison
 */
function cleanBuildOutputs(validateOnly = false) {
  if (validateOnly) {
    log('blue', 'Cleaning .validate directories only (keeping lib/ for speed)...')
  } else {
    log('blue', 'Cleaning all build outputs (lib/, types/, .validate)...')
  }

  const data = getRushList()

  let cleanedValidate = 0
  let cleanedLib = 0
  let cleanedTypes = 0

  for (const project of data.projects) {
    const libPath = path.join(project.fullPath, 'lib')
    const typesPath = path.join(project.fullPath, 'types')
    const validatePath = path.join(project.fullPath, '.validate')

    // Always clean .validate to force TypeScript re-validation
    if (fs.existsSync(validatePath)) {
      fs.rmSync(validatePath, { recursive: true, force: true })
      cleanedValidate++
    }

    // Only clean lib/ and types/ if not validateOnly mode
    if (!validateOnly) {
      if (fs.existsSync(libPath)) {
        fs.rmSync(libPath, { recursive: true, force: true })
        cleanedLib++
      }
      if (fs.existsSync(typesPath)) {
        fs.rmSync(typesPath, { recursive: true, force: true })
        cleanedTypes++
      }
    }
  }

  if (validateOnly) {
    log('green', `Cleaned ${cleanedValidate} .validate directories`)
  } else {
    log('green', `Cleaned: ${cleanedLib} lib/, ${cleanedTypes} types/, ${cleanedValidate} .validate/`)
  }
}

/**
 * Run compile_all with specified worker count and measure memory/time
 */
function runBenchmark(workerCount, toPackage = null, runNumber = 1, totalRuns = 1, forceWorkers = false) {
  return new Promise((resolve) => {
    const args = [COMPILE_ALL, '.', '--parallel', String(workerCount), '--validate']
    if (toPackage) {
      args.push('--to', toPackage)
    }
    if (forceWorkers) {
      args.push('--force-workers')
    }

    const runInfo = totalRuns > 1 ? ` (run ${runNumber}/${totalRuns})` : ''
    log('cyan', `\n${'='.repeat(60)}`)
    log('cyan', `Testing with ${workerCount} worker(s)${runInfo}...`)
    log('cyan', `${'='.repeat(60)}`)

    const startTime = Date.now()
    let peakMemory = 0
    let lastMemory = 0
    const memorySamples = []

    // Use --expose-gc if available for better memory tracking
    const nodeArgs = process.execArgv.includes('--expose-gc') ? ['--expose-gc'] : []
    const proc = spawn('node', [...nodeArgs, ...args], {
      cwd: ROOT_DIR,
      stdio: ['inherit', 'pipe', 'pipe']
    })

    // Sample memory every 200ms for finer granularity
    const memoryInterval = setInterval(() => {
      try {
        // Get memory of main process
        const mainPid = proc.pid
        if (!mainPid) return

        // Use ps to get memory of entire process tree
        try {
          // Get all descendant processes using pgrep recursively
          let allPids = [mainPid]
          try {
            // Get direct children
            const childPids = execSync(
              `pgrep -P ${mainPid} 2>/dev/null || true`,
              { encoding: 'utf-8' }
            ).trim().split('\n').filter(p => p)

            allPids = allPids.concat(childPids.map(p => parseInt(p, 10)).filter(p => !isNaN(p)))

            // Get grandchildren (worker threads spawn their own processes sometimes)
            for (const childPid of childPids) {
              if (childPid) {
                const grandchildPids = execSync(
                  `pgrep -P ${childPid} 2>/dev/null || true`,
                  { encoding: 'utf-8' }
                ).trim().split('\n').filter(p => p)
                allPids = allPids.concat(grandchildPids.map(p => parseInt(p, 10)).filter(p => !isNaN(p)))
              }
            }
          } catch (e) {
            // Ignore
          }

          // Get RSS for all pids at once
          if (allPids.length > 0) {
            const pidsStr = allPids.join(',')
            const psOutput = execSync(
              `ps -o rss= -p ${pidsStr} 2>/dev/null || true`,
              { encoding: 'utf-8' }
            )

            let totalRss = 0
            for (const line of psOutput.trim().split('\n')) {
              const rss = parseInt(line.trim(), 10)
              if (!isNaN(rss)) {
                totalRss += rss
              }
            }

            if (totalRss > 0) {
              lastMemory = totalRss
              memorySamples.push({ time: Date.now() - startTime, rss: totalRss })
              if (totalRss > peakMemory) {
                peakMemory = totalRss
              }
            }
          }
        } catch (e) {
          // Ignore ps errors
        }
      } catch (e) {
        // Ignore errors
      }
    }, 200)

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => {
      stdout += data.toString()
      process.stdout.write(data)
    })

    proc.stderr.on('data', (data) => {
      stderr += data.toString()
      process.stderr.write(data)
    })

    proc.on('close', (code) => {
      clearInterval(memoryInterval)

      const endTime = Date.now()
      const duration = (endTime - startTime) / 1000

      // Parse wall time from output
      let wallTime = duration
      const wallTimeMatch = stdout.match(/Wall time: ([\d.]+)s/)
      if (wallTimeMatch) {
        wallTime = parseFloat(wallTimeMatch[1])
      }

      // Parse CPU time from output
      let cpuTime = 0
      const cpuTimeMatch = stdout.match(/CPU time: ([\d.]+)s/)
      if (cpuTimeMatch) {
        cpuTime = parseFloat(cpuTimeMatch[1])
      }

      // Parse CPU usage from output
      let cpuAvg = 0
      let cpuPeak = 0
      const cpuUsageMatch = stdout.match(/CPU usage: avg ([\d.]+)%, peak ([\d.]+)%/)
      if (cpuUsageMatch) {
        cpuAvg = parseFloat(cpuUsageMatch[1])
        cpuPeak = parseFloat(cpuUsageMatch[2])
      }

      // Parse worker timing stats
      let workerTimingStats = null
      const avgIdleMatch = stdout.match(/Avg idle time per task: (\d+)ms/)
      const avgWorkMatch = stdout.match(/Avg work time per task: (\d+)ms/)
      const utilizationMatch = stdout.match(/Overall utilization: ([\d.]+)%/)
      const totalTasksMatch = stdout.match(/Total tasks: (\d+)/)
      if (avgIdleMatch && avgWorkMatch && utilizationMatch) {
        workerTimingStats = {
          avgIdleTime: parseInt(avgIdleMatch[1], 10),
          avgWorkTime: parseInt(avgWorkMatch[1], 10),
          utilization: parseFloat(utilizationMatch[1]),
          totalTasks: totalTasksMatch ? parseInt(totalTasksMatch[1], 10) : 0
        }
      }

      // Convert KB to MB
      const peakMemoryMB = Math.round(peakMemory / 1024)

      // Calculate average memory (excluding first few samples during startup)
      const stableSamples = memorySamples.slice(Math.min(3, Math.floor(memorySamples.length / 4)))
      const avgMemoryKB = stableSamples.length > 0
        ? stableSamples.reduce((sum, s) => sum + s.rss, 0) / stableSamples.length
        : peakMemory
      const avgMemoryMB = Math.round(avgMemoryKB / 1024)

      resolve({
        workers: workerCount,
        wallTime,
        cpuTime,
        cpuAvg,
        cpuPeak,
        totalTime: duration,
        peakMemoryMB,
        avgMemoryMB,
        memorySamples: memorySamples.length,
        workerTimingStats,
        success: code === 0
      })
    })
  })
}

/**
 * Format table row
 */
function formatRow(workers, wallTime, cpuTime, cpuAvg, cpuPeak, peakMem, avgMem, workerUtil, success) {
  const status = success ? '✓' : '✗'
  const cpuAvgStr = cpuAvg > 0 ? `${cpuAvg.toFixed(0)}%` : '-'
  const cpuPeakStr = cpuPeak > 0 ? `${cpuPeak.toFixed(0)}%` : '-'
  const workerUtilStr = workerUtil > 0 ? `${workerUtil.toFixed(0)}%` : '-'
  return `| ${String(workers).padStart(7)} | ${wallTime.toFixed(1).padStart(9)}s | ${cpuTime.toFixed(1).padStart(7)}s | ${cpuAvgStr.padStart(7)} | ${cpuPeakStr.padStart(8)} | ${workerUtilStr.padStart(10)} | ${String(peakMem).padStart(8)} MB | ${String(avgMem).padStart(7)} MB | ${status.padStart(6)} |`
}

function printHelp() {
  console.log(`
Worker Count Benchmark for fast-build:validate

Usage:
  node scripts/benchmark-workers.js [options]

Options:
  --workers <list>    Comma-separated list of worker counts (default: 1,2,4,6,8,10,12)
  --runs <n>          Number of runs per worker count for averaging (default: 1)
  --skip-clean        Skip cleaning build outputs (use existing cache)
  --clean-validate    Only clean .validate dirs (keep lib/ for faster validation-only tests)
  --to <package>      Only benchmark specific package and its dependencies
  --force-workers     Force exact worker count, ignore memory limits (use with caution!)
  --help              Show this help

Examples:
  # Full benchmark
  node scripts/benchmark-workers.js

  # Quick test with fewer workers
  node scripts/benchmark-workers.js --workers 1,4,8

  # Test validation only (lib/ already built)
  node scripts/benchmark-workers.js --clean-validate --workers 4,8

  # Test specific package
  node scripts/benchmark-workers.js --to @hcengineering/core --workers 1,2,4

  # Multiple runs for averaging
  node scripts/benchmark-workers.js --runs 3 --workers 4,8
`)
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs()

  if (options.help) {
    printHelp()
    process.exit(0)
  }

  console.log('')
  log('green', '╔════════════════════════════════════════════════════════════╗')
  log('green', '║     Worker Count Benchmark for fast-build:validate         ║')
  log('green', '╚════════════════════════════════════════════════════════════╝')
  console.log('')

  log('blue', `Configuration:`)
  log('blue', `  Workers to test: ${options.workerCounts.join(', ')}`)
  log('blue', `  Runs per config: ${options.runs}`)
  log('blue', `  Clean mode: ${options.skipClean ? 'skip' : options.cleanValidateOnly ? 'validate-only' : 'full'}`)
  log('blue', `  Force workers: ${options.forceWorkers ? 'yes' : 'no'}`)
  if (options.toPackage) {
    log('blue', `  Target package: ${options.toPackage}`)
  }
  console.log('')

  const results = []
  const aggregatedResults = []

  for (const workerCount of options.workerCounts) {
    const runsForWorker = []

    for (let run = 1; run <= options.runs; run++) {
      // Clean before each run for fair comparison
      if (!options.skipClean) {
        cleanBuildOutputs(options.cleanValidateOnly)
      }

      const result = await runBenchmark(workerCount, options.toPackage, run, options.runs, options.forceWorkers)
      results.push(result)
      runsForWorker.push(result)

      console.log('')
      const timingInfo = result.workerTimingStats
        ? `, Worker Util: ${result.workerTimingStats.utilization.toFixed(0)}% (idle ${result.workerTimingStats.avgIdleTime}ms, work ${result.workerTimingStats.avgWorkTime}ms)`
        : ''
      log('yellow', `Workers: ${result.workers}, Wall Time: ${result.wallTime.toFixed(1)}s, Peak Memory: ${result.peakMemoryMB} MB, Avg Memory: ${result.avgMemoryMB} MB${timingInfo}`)
    }

    // Aggregate results for this worker count
    if (runsForWorker.length > 0) {
      const successful = runsForWorker.filter(r => r.success)
      if (successful.length > 0) {
        // Aggregate worker timing stats
        const withTiming = successful.filter(r => r.workerTimingStats)
        const avgWorkerUtil = withTiming.length > 0
          ? withTiming.reduce((sum, r) => sum + r.workerTimingStats.utilization, 0) / withTiming.length
          : 0
        const avgIdleTime = withTiming.length > 0
          ? withTiming.reduce((sum, r) => sum + r.workerTimingStats.avgIdleTime, 0) / withTiming.length
          : 0
        const avgWorkTime = withTiming.length > 0
          ? withTiming.reduce((sum, r) => sum + r.workerTimingStats.avgWorkTime, 0) / withTiming.length
          : 0

        aggregatedResults.push({
          workers: workerCount,
          wallTime: successful.reduce((sum, r) => sum + r.wallTime, 0) / successful.length,
          cpuTime: successful.reduce((sum, r) => sum + r.cpuTime, 0) / successful.length,
          cpuAvg: successful.reduce((sum, r) => sum + r.cpuAvg, 0) / successful.length,
          cpuPeak: Math.max(...successful.map(r => r.cpuPeak)),
          peakMemoryMB: Math.max(...successful.map(r => r.peakMemoryMB)),
          avgMemoryMB: Math.round(successful.reduce((sum, r) => sum + r.avgMemoryMB, 0) / successful.length),
          workerUtilization: avgWorkerUtil,
          avgIdleTime: avgIdleTime,
          avgWorkTime: avgWorkTime,
          success: true,
          runs: successful.length
        })
      }
    }
  }

  // Print summary table
  console.log('')
  log('green', '╔═══════════════════════════════════════════════════════════════════════════════╗')
  log('green', '║                             BENCHMARK RESULTS                                  ║')
  log('green', '╚═══════════════════════════════════════════════════════════════════════════════╝')
  console.log('')

  const displayResults = aggregatedResults.length > 0 ? aggregatedResults : results

  console.log('| Workers | Wall Time | CPU Time | CPU Avg | CPU Peak | Worker Util | Peak Mem | Avg Mem | Status |')
  console.log('|---------|-----------|----------|---------|----------|-------------|----------|---------|--------|')

  for (const r of displayResults) {
    const workerUtil = r.workerUtilization || (r.workerTimingStats ? r.workerTimingStats.utilization : 0)
    console.log(formatRow(r.workers, r.wallTime, r.cpuTime, r.cpuAvg || 0, r.cpuPeak || 0, r.peakMemoryMB, r.avgMemoryMB, workerUtil, r.success))
  }

  console.log('')

  // Find best results
  const successfulResults = displayResults.filter(r => r.success)
  if (successfulResults.length > 0) {
    const fastest = successfulResults.reduce((a, b) => a.wallTime < b.wallTime ? a : b)
    const lowestMemory = successfulResults.reduce((a, b) => a.peakMemoryMB < b.peakMemoryMB ? a : b)
    const bestEfficiency = successfulResults.reduce((a, b) => {
      const effA = a.wallTime * a.peakMemoryMB
      const effB = b.wallTime * b.peakMemoryMB
      return effA < effB ? a : b
    })

    log('cyan', `Fastest: ${fastest.workers} workers (${fastest.wallTime.toFixed(1)}s)`)
    log('cyan', `Lowest Peak Memory: ${lowestMemory.workers} workers (${lowestMemory.peakMemoryMB} MB)`)
    log('cyan', `Best Efficiency (time × memory): ${bestEfficiency.workers} workers`)

    // Calculate speedup from 1 worker
    const singleWorker = successfulResults.find(r => r.workers === 1)
    if (singleWorker && fastest.workers !== 1) {
      const speedup = singleWorker.wallTime / fastest.wallTime
      const memoryIncrease = fastest.peakMemoryMB / singleWorker.peakMemoryMB
      log('cyan', `Speedup: ${speedup.toFixed(2)}x (${singleWorker.wallTime.toFixed(1)}s → ${fastest.wallTime.toFixed(1)}s)`)
      log('cyan', `Memory increase: ${memoryIncrease.toFixed(2)}x (${singleWorker.peakMemoryMB} MB → ${fastest.peakMemoryMB} MB)`)
    }

    // Memory per worker analysis
    console.log('')
    log('blue', 'Memory per worker analysis:')
    for (const r of successfulResults) {
      const memPerWorker = Math.round(r.peakMemoryMB / r.workers)
      log('blue', `  ${r.workers} workers: ~${memPerWorker} MB/worker (peak: ${r.peakMemoryMB} MB)`)
    }

    // CPU utilization analysis
    console.log('')
    log('blue', 'CPU utilization analysis:')
    for (const r of successfulResults) {
      const cpuAvgStr = r.cpuAvg > 0 ? `${r.cpuAvg.toFixed(1)}%` : 'N/A'
      const cpuPeakStr = r.cpuPeak > 0 ? `${r.cpuPeak.toFixed(1)}%` : 'N/A'
      const efficiency = r.cpuAvg > 0 ? (r.cpuAvg / (r.workers * 100 / require('os').cpus().length) * 100).toFixed(0) : 'N/A'
      log('blue', `  ${r.workers} workers: avg ${cpuAvgStr}, peak ${cpuPeakStr}, efficiency ~${efficiency}%`)
    }

    // Worker timing analysis
    const withTiming = successfulResults.filter(r => r.workerUtilization > 0 || (r.workerTimingStats && r.workerTimingStats.utilization > 0))
    if (withTiming.length > 0) {
      console.log('')
      log('blue', 'Worker timing analysis (idle vs work time):')
      for (const r of withTiming) {
        const util = r.workerUtilization || r.workerTimingStats?.utilization || 0
        const idleTime = r.avgIdleTime || r.workerTimingStats?.avgIdleTime || 0
        const workTime = r.avgWorkTime || r.workerTimingStats?.avgWorkTime || 0
        log('blue', `  ${r.workers} workers: util ${util.toFixed(1)}%, avg idle ${Math.round(idleTime)}ms, avg work ${Math.round(workTime)}ms`)
      }
    }
  }

  // Save results to JSON
  const reportPath = path.join(ROOT_DIR, 'build-comparison', 'benchmark-results.json')
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    config: {
      workerCounts: options.workerCounts,
      runs: options.runs,
      cleanMode: options.skipClean ? 'skip' : options.cleanValidateOnly ? 'validate-only' : 'full',
      toPackage: options.toPackage
    },
    aggregated: aggregatedResults,
    raw: results
  }, null, 2))

  log('green', `\nResults saved to: ${reportPath}`)
}

main().catch((err) => {
  console.error('Benchmark failed:', err)
  process.exit(1)
})
