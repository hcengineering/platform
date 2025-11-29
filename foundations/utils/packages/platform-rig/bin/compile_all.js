#!/usr/bin/env node

const { execSync, spawn } = require('child_process')
const { existsSync, readFileSync, writeFileSync, statSync, mkdirSync, rmSync, readdirSync, copyFileSync, promises: fsPromises } = require('fs')
const { join, resolve, dirname, relative } = require('path')
const os = require('os')
const { Worker } = require('worker_threads')
const crypto = require('crypto')

const { collectFiles, performESBuild, performESBuildWithSvelte, generateSvelteTypes } = require('./compile.js')

/**
 * CPU usage tracking
 */
let lastCpuInfo = null

function getCpuTimes() {
  const cpus = os.cpus()
  let user = 0, nice = 0, sys = 0, idle = 0, irq = 0
  for (const cpu of cpus) {
    user += cpu.times.user
    nice += cpu.times.nice
    sys += cpu.times.sys
    idle += cpu.times.idle
    irq += cpu.times.irq
  }
  return { user, nice, sys, idle, irq, total: user + nice + sys + idle + irq }
}

function startCpuTracking() {
  lastCpuInfo = getCpuTimes()
  return lastCpuInfo
}

function getCpuUsage() {
  if (!lastCpuInfo) {
    lastCpuInfo = getCpuTimes()
    return { percent: 0, user: 0, sys: 0 }
  }

  const current = getCpuTimes()
  const diff = {
    user: current.user - lastCpuInfo.user,
    nice: current.nice - lastCpuInfo.nice,
    sys: current.sys - lastCpuInfo.sys,
    idle: current.idle - lastCpuInfo.idle,
    total: current.total - lastCpuInfo.total
  }

  const percent = diff.total > 0 ? ((diff.user + diff.nice + diff.sys) / diff.total) * 100 : 0
  const userPercent = diff.total > 0 ? (diff.user / diff.total) * 100 : 0
  const sysPercent = diff.total > 0 ? (diff.sys / diff.total) * 100 : 0

  lastCpuInfo = current
  return { percent, user: userPercent, sys: sysPercent }
}

/**
 * Track CPU usage over time
 */
class CpuTracker {
  constructor(intervalMs = 100) {
    this.intervalMs = intervalMs
    this.samples = []
    this.interval = null
    this.peakPercent = 0
  }

  start() {
    startCpuTracking()
    this.samples = []
    this.peakPercent = 0
    this.interval = setInterval(() => {
      const usage = getCpuUsage()
      this.samples.push(usage)
      if (usage.percent > this.peakPercent) {
        this.peakPercent = usage.percent
      }
    }, this.intervalMs)
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    // Get final sample
    const usage = getCpuUsage()
    this.samples.push(usage)
    if (usage.percent > this.peakPercent) {
      this.peakPercent = usage.percent
    }
  }

  getStats() {
    if (this.samples.length === 0) {
      return { avg: 0, peak: 0, min: 0 }
    }

    const percents = this.samples.map(s => s.percent)
    const avg = percents.reduce((a, b) => a + b, 0) / percents.length
    const peak = Math.max(...percents)
    const min = Math.min(...percents)

    return {
      avg: Math.round(avg * 10) / 10,
      peak: Math.round(peak * 10) / 10,
      min: Math.round(min * 10) / 10,
      samples: this.samples.length
    }
  }
}

/**
 * Get available system memory in MB
 */
function getAvailableMemoryMB() {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()

  // On macOS/Linux, try to get more accurate available memory
  try {
    if (process.platform === 'darwin') {
      // macOS: use vm_stat
      const vmstat = execSync('vm_stat', { encoding: 'utf-8' })
      const pageSize = 4096
      const freeMatch = vmstat.match(/Pages free:\s+(\d+)/)
      const inactiveMatch = vmstat.match(/Pages inactive:\s+(\d+)/)
      if (freeMatch && inactiveMatch) {
        const freePages = parseInt(freeMatch[1], 10)
        const inactivePages = parseInt(inactiveMatch[1], 10)
        return Math.round((freePages + inactivePages) * pageSize / 1024 / 1024)
      }
    } else if (process.platform === 'linux') {
      // Linux: use /proc/meminfo
      const meminfo = readFileSync('/proc/meminfo', 'utf-8')
      const availableMatch = meminfo.match(/MemAvailable:\s+(\d+)/)
      if (availableMatch) {
        return Math.round(parseInt(availableMatch[1], 10) / 1024)
      }
    }
  } catch {
    // Fall back to simple calculation
  }

  return Math.round(freeMem / 1024 / 1024)
}

/**
 * Get smart default worker count based on system resources
 * - Base: 4 workers (good balance of speed and memory)
 * - 8 workers if macOS/Linux with >64GB total RAM
 */
function getDefaultWorkerCount() {
  const totalMemMB = Math.round(os.totalmem() / 1024 / 1024)
  const platform = process.platform

  // Use 8 workers on macOS/Linux with >=64GB RAM
  if ((platform === 'darwin' || platform === 'linux') && totalMemMB >= 64 * 1024) {
    return 8
  }

  // Default to 4 workers
  return 4
}

/**
 * Determine optimal worker count based on available memory
 * Each TypeScript worker uses approximately 1.5-2.5 GB of memory
 */
function getOptimalWorkerCount(requestedWorkers) {
  const availableMem = getAvailableMemoryMB()
  const cpuCount = os.cpus().length

  // Estimate memory per worker for TypeScript validation
  // macOS reports available memory conservatively, so use lower estimate
  const memoryPerWorker = process.platform === 'darwin' ? 1500 : 2500
  const maxWorkersByMemory = Math.max(1, Math.floor(availableMem / memoryPerWorker))

  // Use the minimum of requested, CPU count, and memory-based limit
  const optimal = Math.min(requestedWorkers, cpuCount, maxWorkersByMemory)

  return {
    workers: optimal,
    availableMemoryMB: availableMem,
    limitedByMemory: optimal < requestedWorkers && maxWorkersByMemory < requestedWorkers
  }
}

/**
 * Calculate file hash for content comparison
 */
function getFileHash(filePath) {
  try {
    const content = readFileSync(filePath)
    return crypto.createHash('md5').update(content).digest('hex')
  } catch {
    return null
  }
}

/**
 * Recursively collect all files in a directory
 */
function collectAllFiles(dir, result = []) {
  if (!existsSync(dir)) return result

  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      collectAllFiles(fullPath, result)
    } else {
      result.push(fullPath)
    }
  }
  return result
}

/**
 * Sync directory from source to destination, only copying changed files
 * Returns { copied: number, unchanged: number, removed: number }
 */
function syncDirectory(srcDir, destDir, options = {}) {
  const { removeExtra = false, verbose = false } = options

  let copied = 0
  let unchanged = 0
  let removed = 0

  if (!existsSync(srcDir)) {
    return { copied, unchanged, removed }
  }

  // Ensure destination exists
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true })
  }

  // Get all source files
  const srcFiles = collectAllFiles(srcDir)
  const destFiles = new Set(collectAllFiles(destDir).map(f => relative(destDir, f)))

  for (const srcFile of srcFiles) {
    const relPath = relative(srcDir, srcFile)
    const destFile = join(destDir, relPath)

    // Remove from set to track extra files
    destFiles.delete(relPath)

    // Check if file needs to be copied
    const srcHash = getFileHash(srcFile)
    const destHash = getFileHash(destFile)

    if (srcHash !== destHash) {
      // Create directory if needed
      const destFileDir = dirname(destFile)
      if (!existsSync(destFileDir)) {
        mkdirSync(destFileDir, { recursive: true })
      }

      copyFileSync(srcFile, destFile)
      copied++

      if (verbose) {
        console.log(`  Copied: ${relPath}`)
      }
    } else {
      unchanged++
    }
  }

  // Remove extra files in destination that don't exist in source
  if (removeExtra) {
    for (const extraFile of destFiles) {
      const fullPath = join(destDir, extraFile)
      try {
        rmSync(fullPath)
        removed++
        if (verbose) {
          console.log(`  Removed: ${extraFile}`)
        }
      } catch {
        // Ignore removal errors
      }
    }
  }

  return { copied, unchanged, removed }
}

/**
 * Clean a directory (remove it completely)
 */
function cleanDirectory(dir) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * Worker pool for parallel TypeScript validation
 */
class ValidateWorkerPool {
  constructor(size) {
    this.size = size
    this.workers = []
    this.available = []
    this.pending = []
    this.taskId = 0
    this.callbacks = new Map()
    this.workerPath = join(__dirname, 'validate-worker.js')
    this.gcAvailable = false
    this.workerMemory = new Map() // Track memory per worker
    // Worker timing tracking
    this.workerStats = new Map() // workerId -> { totalIdleTime, totalWorkTime, taskCount, lastTaskCompletedAt }
    this.taskTimings = new Map() // taskId -> { startedAt, workerId }
  }

  async init() {
    const readyPromises = []

    for (let i = 0; i < this.size; i++) {
      // Spawn worker - GC is available if main process was started with --expose-gc
      const worker = new Worker(this.workerPath)
      worker._workerId = i // Track worker id
      this.workers.push(worker)
      // Initialize worker stats - lastTaskCompletedAt starts at init time (worker ready)
      this.workerStats.set(i, { totalIdleTime: 0, totalWorkTime: 0, taskCount: 0, lastTaskCompletedAt: null })

      const readyPromise = new Promise((resolve) => {
        const onMessage = (msg) => {
          if (msg.type === 'ready') {
            worker.off('message', onMessage)
            // Track if GC is available in workers
            if (msg.gcAvailable) {
              this.gcAvailable = true
            }
            if (msg.memory) {
              this.workerMemory.set(i, msg.memory)
            }
            resolve()
          }
        }
        worker.on('message', onMessage)
      })
      readyPromises.push(readyPromise)

      worker.on('message', (msg) => {
        if (msg.id !== undefined) {
          const callback = this.callbacks.get(msg.id)
          if (callback) {
            this.callbacks.delete(msg.id)
            callback(msg)
          }
          // Track timing stats
          const timing = this.taskTimings.get(msg.id)
          if (timing) {
            const completedAt = performance.now()
            const workTime = completedAt - timing.startedAt
            const stats = this.workerStats.get(timing.workerId)
            if (stats) {
              stats.totalWorkTime += workTime
              stats.taskCount++
              stats.lastTaskCompletedAt = completedAt
            }
            this.taskTimings.delete(msg.id)
          }
          // Track memory usage from worker
          if (msg.memory && msg.threadId !== undefined) {
            this.workerMemory.set(msg.threadId, msg.memory.after || msg.memory)
          }
          this.available.push(worker)
          this._processNext()
        }
      })

      worker.on('error', (err) => {
        console.error('Worker error:', err)
      })
    }

    await Promise.all(readyPromises)
    this.available = [...this.workers]
  }

  _processNext() {
    if (this.pending.length > 0 && this.available.length > 0) {
      const { task, resolve, reject } = this.pending.shift()
      const worker = this.available.shift()
      const workerId = worker._workerId
      const startedAt = performance.now()

      // Track idle time (time since worker completed last task until now)
      const stats = this.workerStats.get(workerId)
      if (stats && stats.lastTaskCompletedAt !== null) {
        const idleTime = startedAt - stats.lastTaskCompletedAt
        stats.totalIdleTime += idleTime
      }

      // Store timing info for completion tracking
      this.taskTimings.set(task.id, { startedAt, workerId })

      this.callbacks.set(task.id, (result) => {
        if (result.success) {
          resolve({
            success: true,
            skipped: result.skipped || false,
            fromCache: result.fromCache || false,
            typesHash: result.typesHash,
            syncResult: result.syncResult
          })
        } else {
          resolve({ success: false, error: new Error(result.error) })
        }
      })

      worker.postMessage(task)
    }
  }

  validate(cwd, options = {}) {
    const { reportMemory = false, dependencyTypesHashes = {}, srcDir = 'src' } = options
    return new Promise((resolve, reject) => {
      const task = {
        id: ++this.taskId,
        type: 'validate',
        cwd,
        reportMemory,
        dependencyTypesHashes,
        srcDir
      }

      this.pending.push({ task, resolve, reject })
      this._processNext()
    })
  }

  /**
   * Get types hash for a package without validation
   */
  getTypesHash(cwd) {
    return new Promise((resolve, reject) => {
      const task = {
        id: ++this.taskId,
        type: 'get-types-hash',
        cwd
      }

      // Need to handle this differently since it's not in the normal flow
      const worker = this.available.shift()
      if (!worker) {
        // Queue it like normal
        this.pending.push({
          task,
          resolve: (result) => resolve(result.typesHash || 'unknown'),
          reject
        })
        return
      }

      this.callbacks.set(task.id, (result) => {
        this.available.push(worker)
        this._processNext()
        resolve(result.typesHash || 'unknown')
      })

      worker.postMessage(task)
    })
  }

  /**
   * Request GC on all workers (if available)
   */
  async requestGC() {
    if (!this.gcAvailable) return false

    const gcPromises = this.workers.map((worker, idx) => {
      return new Promise((resolve) => {
        const id = ++this.taskId
        const timeout = setTimeout(() => resolve(false), 1000)

        this.callbacks.set(id, (msg) => {
          clearTimeout(timeout)
          if (msg.memory) {
            this.workerMemory.set(idx, msg.memory)
          }
          resolve(msg.gcRan)
        })

        worker.postMessage({ id, type: 'gc' })
      })
    })

    await Promise.all(gcPromises)
    return true
  }

  /**
   * Get total memory usage across all workers
   */
  getTotalMemoryMB() {
    let total = 0
    for (const mem of this.workerMemory.values()) {
      total += mem.rss || mem.heapUsed || 0
    }
    return total
  }

  /**
   * Get timing statistics for all workers
   */
  getTimingStats() {
    const perWorker = []
    let totalIdleTime = 0
    let totalWorkTime = 0
    let totalTasks = 0

    for (const [workerId, stats] of this.workerStats) {
      const utilization = stats.totalWorkTime > 0
        ? (stats.totalWorkTime / (stats.totalIdleTime + stats.totalWorkTime)) * 100
        : 0
      perWorker.push({
        workerId,
        idleTime: stats.totalIdleTime,
        workTime: stats.totalWorkTime,
        taskCount: stats.taskCount,
        utilization
      })
      totalIdleTime += stats.totalIdleTime
      totalWorkTime += stats.totalWorkTime
      totalTasks += stats.taskCount
    }

    return {
      perWorker,
      totalIdleTime,
      totalWorkTime,
      totalTasks,
      avgIdleTimePerTask: totalTasks > 0 ? totalIdleTime / totalTasks : 0,
      avgWorkTimePerTask: totalTasks > 0 ? totalWorkTime / totalTasks : 0,
      overallUtilization: totalWorkTime > 0 ? (totalWorkTime / (totalIdleTime + totalWorkTime)) * 100 : 0
    }
  }

  async terminate() {
    for (const worker of this.workers) {
      worker.postMessage({ type: 'exit' })
    }
    await Promise.all(this.workers.map(w => w.terminate()))
    this.workers = []
    this.available = []
  }
}

// Global worker pool (initialized lazily)
let workerPool = null

// In-memory cache for rush list result
let rushListCache = null

async function getWorkerPool(size) {
  if (!workerPool) {
    workerPool = new ValidateWorkerPool(size)
    await workerPool.init()
  }
  return workerPool
}

async function terminateWorkerPool() {
  if (workerPool) {
    await workerPool.terminate()
    workerPool = null
  }
}

/**
 * Batch compilation script for Rush monorepo
 * Compiles all packages that have "_phase:build": "compile transpile src"
 * and optionally validates packages with "_phase:validate": "compile validate"
 * in dependency order (topological sort)
 *
 * Usage:
 *   compile-all <rootDir> [options]
 *
 * Options:
 *   --parallel, -p <n>   Run compilation in parallel with n workers (respects dependency order)
 *   --verbose, -v        Show detailed output
 *   --validate           Also run TypeScript validation after transpile
 *   --list, -l           Only print the list of packages in compilation order (no actual compilation)
 *   --to <package>       Only compile the specified package and its dependencies
 *   --help, -h           Show help message
 */

function printUsage() {
  console.log(`
Usage: compile-all <rootDir> [options]

Arguments:
  rootDir              Root directory of the Rush monorepo (where rush.json is located)

Options:
  --parallel, -p <n>   Run compilation in parallel with n workers (default: 4, or 8 on systems with >64GB RAM)
                       If no number specified, uses CPU count (limited by available memory)
                       Parallel compilation respects dependency order (builds in waves)
  --force-workers      Force exact worker count, ignore memory limits (use with caution!)
  --verbose, -v        Show detailed output for each package
  --validate           Also run TypeScript validation for packages with "_phase:validate": "compile validate"
  --no-cache           Clear TypeScript cache (.validate) before validation
  --bundle             Run bundle phase for packages with "_phase:bundle"
  --docker-build       Run docker-build phase (implies --bundle)
  --list, -l           Only print the list of packages in compilation order (no actual compilation)
  --to <package>       Only compile the specified package and its dependencies
  --help, -h           Show this help message

Description:
  This script compiles all Rush packages that have "_phase:build": "compile transpile src"
  in their package.json scripts section. Packages are compiled in dependency order.

  When --validate is specified, also runs TypeScript validation for packages that have
  "_phase:validate": "compile validate" in their scripts.

  When --bundle is specified, runs the bundle phase for packages with "_phase:bundle".

  When --docker-build is specified, runs bundle first, then docker-build for packages
  with "_phase:docker-build".

  When --to is specified, only the specified package and all its dependencies will be compiled.

  When --list is specified, prints the compilation order without actually compiling.

  The script automatically detects available memory and limits workers to prevent OOM.

Examples:
  compile-all .
  compile-all . --parallel 4 --verbose
  compile-all /path/to/repo -p -v --validate
  compile-all . --validate --no-cache
  compile-all . --bundle --to @hcengineering/pod-server
  compile-all . --docker-build --to @hcengineering/pod-server
  compile-all . --list
  compile-all . --to @hcengineering/core
`)
}

function parseArgs(args) {
  let parallel = getDefaultWorkerCount()
  let verbose = false
  let doValidate = false
  let noCache = false
  let doBundle = false
  let doDockerBuild = false
  let help = false
  let list = false
  let toPackage = null
  let rootDir = ''
  let forceWorkers = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--force-workers') {
      forceWorkers = true
    } else if (arg === '--parallel' || arg === '-p') {
      const next = args[i + 1]
      if (next !== undefined && !next.startsWith('-')) {
        parallel = parseInt(next, 10)
        if (isNaN(parallel) || parallel < 1) {
          parallel = 1
        }
        i++
      } else {
        // Default to CPU count if no number specified
        parallel = os.cpus().length
      }
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true
    } else if (arg === '--validate') {
      doValidate = true
    } else if (arg === '--no-cache') {
      noCache = true
    } else if (arg === '--bundle') {
      doBundle = true
    } else if (arg === '--docker-build') {
      doDockerBuild = true
      doBundle = true  // docker-build implies bundle
    } else if (arg === '--list' || arg === '-l') {
      list = true
    } else if (arg === '--to') {
      const next = args[i + 1]
      if (next !== undefined && !next.startsWith('-')) {
        toPackage = next
        i++
      }
    } else if (arg === '--help' || arg === '-h') {
      help = true
    } else if (!arg.startsWith('-')) {
      // Positional argument - rootDir
      rootDir = arg
    }
  }

  // Read Rush custom parameters from environment variables
  // Rush sets these when running global commands with custom parameters
  // Try multiple formats as Rush may use different naming conventions
  if (!toPackage) {
    toPackage = process.env.RUSH_TO || process.env.TO || null
  }
  if (!list) {
    list = process.env.RUSH_LIST === '1' || process.env.LIST === '1'
  }
  if (!verbose) {
    verbose = process.env.RUSH_VERBOSE === '1' || process.env.VERBOSE === '1'
  }

  return { parallel, verbose, doValidate, noCache, doBundle, doDockerBuild, help, list, toPackage, rootDir, forceWorkers }
}

/**
 * Read package.json and extract dependencies and phase scripts
 */
function getPackageInfoSync(packageJsonPath) {
  if (!existsSync(packageJsonPath)) {
    return { dependencies: [], phaseBuild: null, phaseValidate: null, phaseBundle: null, phaseDockerBuild: null }
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  return parsePackageJson(packageJson)
}

async function getPackageInfoAsync(packageJsonPath) {
  try {
    const content = await fsPromises.readFile(packageJsonPath, 'utf-8')
    const packageJson = JSON.parse(content)
    return parsePackageJson(packageJson)
  } catch {
    return { dependencies: [], phaseBuild: null, phaseValidate: null, phaseBundle: null, phaseDockerBuild: null }
  }
}

function parsePackageJson(packageJson) {
  const phaseBuild = packageJson.scripts?.['_phase:build']
  const phaseValidate = packageJson.scripts?.['_phase:validate']
  const phaseBundle = packageJson.scripts?.['_phase:bundle']
  const phaseDockerBuild = packageJson.scripts?.['_phase:docker-build']
  const bundleScript = packageJson.scripts?.['bundle']
  const dockerBuildScript = packageJson.scripts?.['docker:build']

  // Collect all workspace dependencies
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies
  }

  const dependencies = Object.keys(allDeps).filter(dep => {
    const version = allDeps[dep]
    // workspace: dependencies are local packages
    return version && (version.startsWith('workspace:') || version.startsWith('link:'))
  })

  return { dependencies, phaseBuild, phaseValidate, phaseBundle, phaseDockerBuild, bundleScript, dockerBuildScript }
}

/**
 * Build dependency graph for all projects
 */
async function buildDependencyGraph(projects) {
  const graph = new Map() // packageName -> { project, dependencies, dependents, phaseBuild, phaseValidate }
  const projectByName = new Map()

  // First pass: read all package.json files in parallel
  const packageInfoPromises = projects.map(async (project) => {
    const packageJsonPath = join(project.fullPath, 'package.json')
    const info = await getPackageInfoAsync(packageJsonPath)
    return { project, info }
  })

  const packageInfos = await Promise.all(packageInfoPromises)

  // Second pass: initialize all nodes
  for (const { project, info } of packageInfos) {
    projectByName.set(project.name, project)
    const { dependencies, phaseBuild, phaseValidate, phaseBundle, phaseDockerBuild, bundleScript, dockerBuildScript } = info

    graph.set(project.name, {
      project,
      dependencies: new Set(dependencies),
      dependents: new Set(),
      phaseBuild,
      phaseValidate,
      phaseBundle,
      phaseDockerBuild,
      bundleScript,
      dockerBuildScript
    })
  }

  // Third pass: filter dependencies to only include projects in our list and build dependents
  for (const [name, node] of graph) {
    const validDeps = new Set()
    for (const dep of node.dependencies) {
      if (graph.has(dep)) {
        validDeps.add(dep)
        // Add this package as a dependent of the dependency
        graph.get(dep).dependents.add(name)
      }
    }
    node.dependencies = validDeps
  }

  return { graph, projectByName }
}

/**
 * Get all dependencies of a package (transitive closure)
 */
function getAllDependencies(graph, packageName) {
  const result = new Set()
  const visited = new Set()
  const stack = [packageName]

  while (stack.length > 0) {
    const current = stack.pop()
    if (visited.has(current)) continue
    visited.add(current)

    const node = graph.get(current)
    if (!node) continue

    for (const dep of node.dependencies) {
      result.add(dep)
      if (!visited.has(dep)) {
        stack.push(dep)
      }
    }
  }

  return result
}

/**
 * Topological sort using Kahn's algorithm
 * Returns array of "waves" - each wave contains packages that can be built in parallel
 */
function topologicalSortWaves(graph, filterFn) {
  // Filter to only packages we want to compile
  const filteredNames = new Set()
  for (const [name, node] of graph) {
    if (filterFn(node, name)) {
      filteredNames.add(name)
    }
  }

  // Calculate in-degree for filtered packages only
  const inDegree = new Map()
  for (const name of filteredNames) {
    let count = 0
    for (const dep of graph.get(name).dependencies) {
      if (filteredNames.has(dep)) {
        count++
      }
    }
    inDegree.set(name, count)
  }

  const waves = []
  const processed = new Set()

  while (processed.size < filteredNames.size) {
    // Find all packages with no remaining dependencies (in-degree = 0)
    const wave = []
    for (const name of filteredNames) {
      if (!processed.has(name) && inDegree.get(name) === 0) {
        const node = graph.get(name)
        wave.push({
          ...node.project,
          phaseValidate: node.phaseValidate
        })
      }
    }

    if (wave.length === 0) {
      // Circular dependency detected
      const remaining = [...filteredNames].filter(n => !processed.has(n))
      throw new Error(`Circular dependency detected among: ${remaining.join(', ')}`)
    }

    waves.push(wave)

    // Mark these as processed and update in-degrees
    for (const project of wave) {
      processed.add(project.name)
      const node = graph.get(project.name)
      for (const dependent of node.dependents) {
        if (filteredNames.has(dependent) && inDegree.has(dependent)) {
          inDegree.set(dependent, inDegree.get(dependent) - 1)
        }
      }
    }
  }

  return waves
}

async function transpilePackage(cwd, srcDir) {
  const filesToTranspile = collectFiles(join(cwd, srcDir))
  if (filesToTranspile.length === 0) {
    return { success: true, filesCount: 0 }
  }

  // Convert absolute paths to relative paths from cwd
  const relativeFiles = filesToTranspile.map((f) => f.replace(cwd + '/', ''))

  await performESBuild(relativeFiles, {
    srcDir,
    cwd,
    outDir: 'lib'
  })

  return { success: true, filesCount: relativeFiles.length }
}

/**
 * Run bundle phase for a package
 * Executes the bundle script defined in package.json
 */
async function runBundle(project, verbose = false) {
  const cwd = project.fullPath
  const node = project._node

  if (!node || !node.bundleScript) {
    return { success: false, error: new Error('No bundle script defined') }
  }

  // Skip "echo done" type scripts
  if (node.bundleScript.startsWith('echo ')) {
    return { success: true, skipped: true }
  }

  try {
    const startTime = performance.now()

    // Run rushx bundle
    execSync('rushx bundle', {
      cwd,
      encoding: 'utf-8',
      stdio: verbose ? 'inherit' : ['pipe', 'pipe', 'pipe']
    })

    const time = performance.now() - startTime
    return { success: true, time }
  } catch (err) {
    return { success: false, error: err }
  }
}

/**
 * Run docker-build phase for a package
 * Executes the docker:build script defined in package.json
 */
async function runDockerBuild(project, verbose = false) {
  const cwd = project.fullPath
  const node = project._node

  if (!node || !node.dockerBuildScript) {
    return { success: false, error: new Error('No docker:build script defined') }
  }

  try {
    const startTime = performance.now()

    // Run rushx docker:build
    execSync('rushx docker:build', {
      cwd,
      encoding: 'utf-8',
      stdio: verbose ? 'inherit' : ['pipe', 'pipe', 'pipe']
    })

    const time = performance.now() - startTime
    return { success: true, time }
  } catch (err) {
    return { success: false, error: err }
  }
}

/**
 * Clean TypeScript cache directories for packages
 */
function cleanValidateCache(packages, graph, verbose = false) {
  let cleaned = 0
  for (const packageName of packages) {
    const node = graph.get(packageName)
    if (!node) continue

    const validateDir = join(node.project.fullPath, '.validate')
    if (existsSync(validateDir)) {
      cleanDirectory(validateDir)
      cleaned++
    }
  }

  if (verbose && cleaned > 0) {
    console.log(`Cleaned ${cleaned} .validate directories`)
  }

  return cleaned
}

/**
 * Run TypeScript validation in a specific package directory using worker pool
 */
async function validatePackage(cwd, useWorkerPool = false, pool = null) {
  if (useWorkerPool && pool) {
    return pool.validate(cwd)
  }

  // Fallback to in-process validation
  const { validateTSC } = require('./compile.js')
  try {
    await validateTSC({ cwd, throwOnError: true })
    return { success: true }
  } catch (err) {
    return { success: false, error: err }
  }
}



/**
 * Compile all packages in two phases:
 * 1. Transpile phase - fast esbuild transpilation (only compile transpile src packages)
 * 2. Validate phase - parallel TypeScript validation via worker pool (all compile validate packages)
 */
async function compileStreaming(graph, packagesToTranspile, packagesToValidate, concurrency, doValidate, verbose, onProgress, workerPool = null) {
  const results = new Map() // packageName -> result
  const transpileCompleted = new Set() // packageNames that finished transpile
  const validateCompleted = new Set() // packageNames that finished validate

  // Get dependencies that are in our transpile set (for transpile ordering)
  function getTranspileDeps(packageName) {
    const node = graph.get(packageName)
    return [...node.dependencies].filter(dep => packagesToTranspile.has(dep))
  }

  // Get dependencies that are in our validate set (for validate ordering)
  function getValidateDeps(packageName) {
    const node = graph.get(packageName)
    return [...node.dependencies].filter(dep => packagesToValidate.has(dep))
  }

  // Check if all dependencies of a package have completed validation
  function canStartValidate(packageName) {
    const deps = getValidateDeps(packageName)
    return deps.every(dep => validateCompleted.has(dep))
  }

  // Phase 1: Transpile all packages (fast, respects dependencies)
  async function transpileAll() {
    if (packagesToTranspile.size === 0) {
      return
    }

    const pending = new Set(packagesToTranspile)
    const inProgress = new Set()
    let activeTranspilers = 0

    function canStartTranspile(packageName) {
      const deps = getTranspileDeps(packageName)
      return deps.every(dep => transpileCompleted.has(dep))
    }

    return new Promise((resolve) => {
      async function transpileOne(packageName) {
        const node = graph.get(packageName)
        const project = { ...node.project, phaseValidate: node.phaseValidate }

        // Determine source directory based on phaseBuild
        const srcDir = node.phaseBuild === 'compile transpile tests' ? 'tests' : 'src'
        const isUiEsbuild = node.phaseBuild === 'compile ui-esbuild'

        const st = performance.now()
        try {
          const filesToTranspile = collectFiles(join(project.fullPath, srcDir))
          if (filesToTranspile.length === 0) {
            results.set(packageName, { project, skipped: false, time: 0, filesCount: 0, validated: false })
          } else {
            const relativeFiles = filesToTranspile.map((f) => f.replace(project.fullPath + '/', ''))

            if (isUiEsbuild) {
              // Use Svelte-aware build for ui-esbuild packages
              await performESBuildWithSvelte(filesToTranspile, { cwd: project.fullPath })
              await generateSvelteTypes({ cwd: project.fullPath })
            } else {
              await performESBuild(relativeFiles, { srcDir, cwd: project.fullPath, outDir: 'lib' })
            }

            const time = performance.now() - st
            results.set(packageName, { project, skipped: false, time, filesCount: relativeFiles.length, validated: false })
            if (verbose) {
              const svelteInfo = isUiEsbuild ? ' (svelte)' : ''
              console.log(`    ${project.name} transpiled${svelteInfo} in ${Math.round(time * 100) / 100}ms (${relativeFiles.length} files)`)
            }
          }
        } catch (err) {
          results.set(packageName, { project, skipped: false, error: err })
        }
        transpileCompleted.add(packageName)
      }

      function schedule() {
        if (transpileCompleted.size === packagesToTranspile.size) {
          resolve()
          return
        }

        for (const name of pending) {
          if (activeTranspilers >= concurrency) break
          if (inProgress.has(name) || !canStartTranspile(name)) continue

          pending.delete(name)
          inProgress.add(name)
          activeTranspilers++

          transpileOne(name).finally(() => {
            inProgress.delete(name)
            activeTranspilers--
            schedule()
          })
        }
      }

      schedule()
    })
  }

  // Phase 2: Validate all packages (parallel via worker pool, respects dependencies)
  // Track types hashes for incremental validation
  const typesHashes = new Map() // packageName -> typesHash

  async function validateAll() {
    if (!doValidate || packagesToValidate.size === 0) {
      return
    }

    const pendingValidation = new Set(packagesToValidate)
    const validationInProgress = new Set()
    let activeValidators = 0
    let hasError = false
    let completedCount = 0

    let skippedValidations = 0
    let fromCacheCount = 0

    if (verbose) {
      console.log(`\n  Starting parallel validation of ${packagesToValidate.size} packages with ${concurrency} workers...`)
    } else {
      console.log(`\n  Phase 2: Validating ${packagesToValidate.size} packages...`)
    }

    return new Promise((resolve) => {
      async function validateOne(packageName) {
        const node = graph.get(packageName)
        const project = node.project

        // Initialize result if not already set (for validate-only packages)
        if (!results.has(packageName)) {
          results.set(packageName, { project, skipped: false, time: 0, filesCount: 0, validated: false })
        }
        const result = results.get(packageName)

        // Collect types hashes from dependencies that are in our validate set
        const dependencyTypesHashes = {}
        for (const dep of node.dependencies) {
          if (packagesToValidate.has(dep) && typesHashes.has(dep)) {
            dependencyTypesHashes[dep] = typesHashes.get(dep)
          }
        }

        // Determine source directory based on phaseBuild
        const srcDir = node.phaseBuild === 'compile transpile tests' ? 'tests' : 'src'

        const st = performance.now()
        try {
          let validateResult
          if (workerPool) {
            validateResult = await workerPool.validate(project.fullPath, {
              dependencyTypesHashes,
              srcDir
            })
          } else {
            const { validateTSC } = require('./validate-worker.js')
            try {
              validateResult = validateTSC(project.fullPath, { dependencyTypesHashes, srcDir })
              validateResult.success = true
            } catch (err) {
              validateResult = { success: false, error: err }
            }
          }

          const validateTime = performance.now() - st
          if (!validateResult.success) {
            result.error = validateResult.error || new Error('Validation failed')
            result.validated = false
            hasError = true
          } else {
            result.validated = true
            result.validateTime = validateTime
            result.validationSkipped = validateResult.skipped || false
            result.fromCache = validateResult.fromCache || false
            result.syncResult = validateResult.syncResult

            // Store types hash for dependents to use
            if (validateResult.typesHash) {
              typesHashes.set(packageName, validateResult.typesHash)
            }

            if (validateResult.skipped) {
              skippedValidations++
            }
            if (validateResult.fromCache) {
              fromCacheCount++
            }
          }

          if (verbose) {
            const status = result.validated ? '✓' : '✗'
            const cacheInfo = result.fromCache ? ' (hash match)' : (result.validationSkipped ? ' (cached)' : '')
            const syncInfo = result.syncResult ? ` [sync: ${result.syncResult.copied}↑ ${result.syncResult.removed}↓]` : ''
            console.log(`    ${project.name} validated ${status} in ${Math.round(validateTime * 100) / 100}ms${cacheInfo}${syncInfo}`)
          }
        } catch (err) {
          result.error = err
          result.validated = false
          hasError = true
        }

        validateCompleted.add(packageName)
        completedCount++

        if (onProgress) {
          onProgress({
            completed: completedCount,
            total: packagesToValidate.size,
            package: packageName,
            result
          })
        }
      }

      function schedule() {
        if (validateCompleted.size === packagesToValidate.size) {
          if (verbose) {
            if (fromCacheCount > 0 || skippedValidations > 0) {
              console.log(`  [Cache: ${fromCacheCount} hash matches, ${skippedValidations} mtime skipped]`)
            }
          }
          resolve()
          return
        }

        // Find packages ready to validate (all deps validated)
        const ready = []
        for (const name of pendingValidation) {
          if (!validationInProgress.has(name) && canStartValidate(name)) {
            ready.push(name)
          }
        }

        if (verbose && ready.length > 1 && activeValidators < concurrency) {
          console.log(`  [Parallel: ${ready.length} ready, ${activeValidators}/${concurrency} active]`)
        }

        for (const name of ready) {
          if (activeValidators >= concurrency) break

          pendingValidation.delete(name)
          validationInProgress.add(name)
          activeValidators++

          validateOne(name).finally(() => {
            validationInProgress.delete(name)
            activeValidators--
            schedule()
          })
        }
      }

      schedule()
    })
  }

  // Execute phases
  if (verbose) {
    console.log('\n  Phase 1: Transpiling...')
  }
  await transpileAll()

  if (verbose) {
    console.log(`\n  Phase 2: Validating...`)
  }
  await validateAll()

  return results
}

/**
 * Print list of packages in compilation order
 */
function printCompilationOrder(waves, graph, doValidate) {
  console.log('\nCompilation order:')
  console.log('==================\n')

  let totalPackages = 0
  let totalToValidate = 0

  for (let i = 0; i < waves.length; i++) {
    const wave = waves[i]
    console.log(`Wave ${i + 1} (${wave.length} packages):`)

    for (const project of wave) {
      const node = graph.get(project.name)
      const deps = [...node.dependencies].filter(d => {
        const depNode = graph.get(d)
        return depNode && (depNode.phaseBuild === 'compile transpile src' || depNode.phaseBuild === 'compile transpile tests')
      })

      const willValidate = doValidate && project.phaseValidate === 'compile validate'
      const validateMark = willValidate ? ' [+validate]' : ''

      if (deps.length > 0) {
        console.log(`  ${project.name}${validateMark}`)
        console.log(`    depends on: ${deps.join(', ')}`)
      } else {
        console.log(`  ${project.name}${validateMark}`)
      }

      totalPackages++
      if (willValidate) totalToValidate++
    }
    console.log()
  }

  console.log('==================')
  console.log(`Total: ${totalPackages} packages in ${waves.length} waves`)
  if (doValidate) {
    console.log(`Will validate: ${totalToValidate} packages`)
  }
}

/**
 * Get rush list result with caching based on rush.json mtime
 * Uses both in-memory and file-based caching for persistence between runs
 */
async function getRushList(rootDir, verbose) {
  const rushJsonPath = join(rootDir, 'rush.json')
  const pnpmLockPath = join(rootDir, 'common/config/rush/pnpm-lock.yaml')
  const cacheFilePath = join(rootDir, 'common/temp/.rush-list-cache.json')

  // Get mtime of rush.json and pnpm-lock for cache invalidation
  let rushJsonMtime = 0
  let pnpmLockMtime = 0
  try {
    rushJsonMtime = statSync(rushJsonPath).mtimeMs
  } catch {}
  try {
    pnpmLockMtime = statSync(pnpmLockPath).mtimeMs
  } catch {}

  const cacheKey = `${rushJsonMtime}:${pnpmLockMtime}`

  // Check in-memory cache first
  if (rushListCache && rushListCache.key === cacheKey) {
    if (verbose) {
      console.log(`rush list from memory cache (${rushListCache.projects.length} projects)`)
    }
    return rushListCache.projects
  }

  // Check file-based cache
  try {
    if (existsSync(cacheFilePath)) {
      const cacheContent = JSON.parse(readFileSync(cacheFilePath, 'utf-8'))
      if (cacheContent.key === cacheKey && Array.isArray(cacheContent.projects)) {
        if (verbose) {
          console.log(`rush list from file cache (${cacheContent.projects.length} projects)`)
        }
        // Store in memory cache too
        rushListCache = {
          key: cacheKey,
          projects: cacheContent.projects
        }
        return cacheContent.projects
      }
    }
  } catch {
    // Cache file corrupted or unreadable, will regenerate
  }

  // Run rush list --json
  const rushListStart = performance.now()
  let rushOutput
  try {
    rushOutput = execSync('rush list --json', {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
  } catch (err) {
    throw new Error(`Failed to run rush list --json: ${err.message}`)
  }

  if (verbose) {
    console.log(`rush list completed in ${(performance.now() - rushListStart).toFixed(0)}ms`)
  }

  // Parse JSON output (skip any non-JSON lines at the beginning)
  const jsonStart = rushOutput.indexOf('{')
  if (jsonStart === -1) {
    throw new Error('Could not find JSON in rush output')
  }

  const jsonStr = rushOutput.slice(jsonStart)
  let rushList

  try {
    rushList = JSON.parse(jsonStr)
  } catch (err) {
    throw new Error(`Failed to parse rush list output: ${err.message}`)
  }

  // Store in memory cache
  rushListCache = {
    key: cacheKey,
    projects: rushList.projects
  }

  // Store in file cache (async, don't wait)
  try {
    const cacheData = JSON.stringify({ key: cacheKey, projects: rushList.projects })
    writeFileSync(cacheFilePath, cacheData, 'utf-8')
  } catch {
    // Ignore cache write errors
  }

  return rushList.projects
}

async function compileAll(rootDir, options = {}) {
  const {
    parallel = 4,
    verbose = false,
    doValidate = false,
    noCache = false,
    doBundle = false,
    doDockerBuild = false,
    list = false,
    toPackage = null,
    forceWorkers = false
  } = options

  const startTime = performance.now()

  // Check available memory and adjust worker count
  const memoryInfo = getOptimalWorkerCount(parallel)
  const effectiveParallel = forceWorkers ? parallel : memoryInfo.workers
  const initialMemoryMB = memoryInfo.availableMemoryMB

  // Track peak memory usage
  let peakMemoryMB = 0
  let memoryCheckInterval = null

  function updatePeakMemory() {
    const currentMem = process.memoryUsage()
    const currentMB = Math.round(currentMem.rss / 1024 / 1024)
    if (currentMB > peakMemoryMB) {
      peakMemoryMB = currentMB
    }
  }

  // Start periodic memory tracking
  memoryCheckInterval = setInterval(updatePeakMemory, 100)
  updatePeakMemory() // Initial check

  // Start CPU tracking
  const cpuTracker = new CpuTracker(100)
  cpuTracker.start()

  if (memoryInfo.limitedByMemory && !forceWorkers && verbose) {
    console.log(`Warning: Limited workers to ${effectiveParallel} (requested ${parallel}) due to available memory: ${memoryInfo.availableMemoryMB} MB`)
  }
  if (forceWorkers && memoryInfo.limitedByMemory) {
    console.log(`Warning: Forcing ${parallel} workers despite memory limit (available: ${memoryInfo.availableMemoryMB} MB)`)
  }

  // Get rush list (with caching)
  const projects = await getRushList(rootDir, verbose)

  if (verbose) {
    console.log(`Found ${projects.length} projects`)
  }

  // Build dependency graph (parallel package.json reading)
  const graphBuildStart = performance.now()
  const { graph } = await buildDependencyGraph(projects)
  if (verbose) {
    console.log(`Graph built in ${(performance.now() - graphBuildStart).toFixed(0)}ms`)
  }

  // Collect statistics by phase
  const phaseBuildStats = {}
  const phaseValidateStats = {}
  for (const [name, node] of graph) {
    const buildPhase = node.phaseBuild || '(none)'
    const validatePhase = node.phaseValidate || '(none)'
    phaseBuildStats[buildPhase] = (phaseBuildStats[buildPhase] || 0) + 1
    phaseValidateStats[validatePhase] = (phaseValidateStats[validatePhase] || 0) + 1
  }

  // Collect bundle and docker-build stats
  const phaseBundleStats = {}
  const phaseDockerBuildStats = {}
  for (const [name, node] of graph) {
    const bundlePhase = node.phaseBundle || '(none)'
    const dockerBuildPhase = node.phaseDockerBuild || '(none)'
    phaseBundleStats[bundlePhase] = (phaseBundleStats[bundlePhase] || 0) + 1
    phaseDockerBuildStats[dockerBuildPhase] = (phaseDockerBuildStats[dockerBuildPhase] || 0) + 1
  }

  // If --to is specified, get all dependencies of the target package
  let targetPackages = null
  if (toPackage) {
    if (!graph.has(toPackage)) {
      throw new Error(`Package "${toPackage}" not found in the project`)
    }

    const targetNode = graph.get(toPackage)

    // For bundle/docker-build, we don't require compile transpile src
    const isValidBuildPhase = targetNode.phaseBuild === 'compile transpile src' ||
                              targetNode.phaseBuild === 'compile transpile tests' ||
                              targetNode.phaseBuild === 'compile ui-esbuild'
    if (!doBundle && !doDockerBuild && !isValidBuildPhase) {
      throw new Error(`Package "${toPackage}" does not have a supported "_phase:build" (compile transpile src/tests or compile ui-esbuild)`)
    }

    // Get all dependencies + the target itself
    targetPackages = getAllDependencies(graph, toPackage)
    targetPackages.add(toPackage)

    if (verbose) {
      console.log(`Building ${toPackage} and ${targetPackages.size - 1} dependencies`)
    }
  }

  // Get waves of packages to transpile (compile transpile src/tests OR compile ui-esbuild)
  const transpileWaves = topologicalSortWaves(graph, (node, name) => {
    // Must have the right phase for transpile (src, tests, or ui-esbuild)
    const isTranspilePhase = node.phaseBuild === 'compile transpile src' ||
                             node.phaseBuild === 'compile transpile tests' ||
                             node.phaseBuild === 'compile ui-esbuild'
    if (!isTranspilePhase) {
      return false
    }
    // If --to is specified, only include target packages
    if (targetPackages && !targetPackages.has(name)) {
      return false
    }
    return true
  })

  // Get waves of packages to validate (all with compile validate)
  // Note: ui-esbuild packages are now supported since we generate .svelte.d.ts files during transpile
  const validateWaves = topologicalSortWaves(graph, (node, name) => {
    // Must have compile validate phase
    if (node.phaseValidate !== 'compile validate') {
      return false
    }
    // If --to is specified, only include target packages and their dependencies
    if (targetPackages && !targetPackages.has(name)) {
      return false
    }
    return true
  })

  const totalToTranspile = transpileWaves.reduce((sum, wave) => sum + wave.length, 0)
  const totalToValidate = validateWaves.reduce((sum, wave) => sum + wave.length, 0)

  // Get packages to bundle
  const bundleWaves = doBundle ? topologicalSortWaves(graph, (node, name) => {
    // Must have bundle phase that's not just "echo done"
    if (!node.phaseBundle || node.phaseBundle === 'echo done') {
      return false
    }
    // If --to is specified, only include target packages
    if (targetPackages && !targetPackages.has(name)) {
      return false
    }
    return true
  }) : []

  const totalToBundle = bundleWaves.reduce((sum, wave) => sum + wave.length, 0)

  // Get packages to docker-build
  const dockerBuildWaves = doDockerBuild ? topologicalSortWaves(graph, (node, name) => {
    if (!node.phaseDockerBuild) {
      return false
    }
    // If --to is specified, only include target packages
    if (targetPackages && !targetPackages.has(name)) {
      return false
    }
    return true
  }) : []

  const totalToDockerBuild = dockerBuildWaves.reduce((sum, wave) => sum + wave.length, 0)

  // If --list mode, just print and exit
  if (list) {
    printCompilationOrder(transpileWaves, graph, doValidate)
    if (doBundle && totalToBundle > 0) {
      console.log(`\nBundle packages: ${totalToBundle}`)
      for (const wave of bundleWaves) {
        for (const project of wave) {
          console.log(`  ${project.name}`)
        }
      }
    }
    if (doDockerBuild && totalToDockerBuild > 0) {
      console.log(`\nDocker-build packages: ${totalToDockerBuild}`)
      for (const wave of dockerBuildWaves) {
        for (const project of wave) {
          console.log(`  ${project.name}`)
        }
      }
    }
    return {
      success: true,
      compiled: 0,
      validated: 0,
      bundled: 0,
      dockerBuilt: 0,
      skipped: projects.length - totalToTranspile,
      errors: 0,
      waves: transpileWaves.length,
      time: performance.now() - startTime,
      listOnly: true
    }
  }

  if (verbose) {
    console.log(`Packages to transpile: ${totalToTranspile} in ${transpileWaves.length} waves`)
    if (doValidate) {
      console.log(`Packages to validate: ${totalToValidate} in ${validateWaves.length} waves`)
    }
    if (doBundle) {
      console.log(`Packages to bundle: ${totalToBundle} in ${bundleWaves.length} waves`)
    }
    if (doDockerBuild) {
      console.log(`Packages to docker-build: ${totalToDockerBuild} in ${dockerBuildWaves.length} waves`)
    }
    if (effectiveParallel > 1) {
      console.log(`Running with up to ${effectiveParallel} parallel workers (streaming mode)`)
    }
  }

  // Clean validation cache if --no-cache
  if (noCache && doValidate) {
    const packagesToClean = new Set()
    for (const wave of validateWaves) {
      for (const project of wave) {
        packagesToClean.add(project.name)
      }
    }
    if (verbose) {
      console.log(`\nClearing TypeScript cache for ${packagesToClean.size} packages...`)
    }
    cleanValidateCache(packagesToClean, graph, verbose)
  }

  // Initialize worker pool for validation if needed
  let pool = null
  let workerPoolPeakMemoryMB = 0
  if (doValidate && effectiveParallel > 1 && totalToValidate > 0) {
    pool = await getWorkerPool(effectiveParallel)
  }

  const terminalWidth = process.stdout.columns || 120

  // Build set of packages to compile
  // Build sets of packages to transpile and validate
  const packagesToTranspileSet = new Set()
  for (const wave of transpileWaves) {
    for (const project of wave) {
      packagesToTranspileSet.add(project.name)
    }
  }

  const packagesToValidateSet = new Set()
  for (const wave of validateWaves) {
    for (const project of wave) {
      packagesToValidateSet.add(project.name)
    }
  }

  // Use streaming parallelization for better CPU utilization
  let lastPrintedPct = -1
  let validatedCount = 0
  const streamingResults = await compileStreaming(
    graph,
    packagesToTranspileSet,
    packagesToValidateSet,
    effectiveParallel,
    doValidate,
    verbose,
    (progress) => {
      if (progress.result.validated) {
        validatedCount++
      }
      if (!verbose) {
        // Print progress every 10%
        const pct = Math.round(progress.completed / progress.total * 100)
        if (pct >= lastPrintedPct + 10 || progress.completed === progress.total) {
          const validatedInfo = doValidate ? `, ${validatedCount} validated` : ''
          console.log(`Progress: ${progress.completed}/${progress.total} packages (${pct}%)${validatedInfo}`)
          lastPrintedPct = pct
        }
      }
    },
    pool
  )

  // Get worker pool memory and timing stats before terminating
  let workerTimingStats = null
  if (pool) {
    workerPoolPeakMemoryMB = pool.getTotalMemoryMB()
    workerTimingStats = pool.getTimingStats()
    await terminateWorkerPool()
  }

  // Phase 3: Bundle (if requested)
  let bundleResults = []
  if (doBundle && totalToBundle > 0) {
    if (!verbose) {
      console.log(`\n  Phase 3: Bundling ${totalToBundle} packages...`)
    } else {
      console.log(`\n  Phase 3: Bundling...`)
    }

    let bundleCount = 0
    for (const wave of bundleWaves) {
      // Bundle packages in wave (can be parallelized but usually sequential is fine for bundle)
      for (const project of wave) {
        const node = graph.get(project.name)
        const projectWithNode = { ...project, _node: node }

        const result = await runBundle(projectWithNode, verbose)
        bundleResults.push({ project, ...result })

        if (result.success) {
          bundleCount++
          if (verbose) {
            const timeInfo = result.time ? ` in ${Math.round(result.time)}ms` : ''
            const skipInfo = result.skipped ? ' (skipped)' : ''
            console.log(`    ${project.name} bundled${skipInfo}${timeInfo}`)
          }
        } else {
          console.error(`    ${project.name} bundle failed: ${result.error?.message || 'Unknown error'}`)
        }
      }
    }

    if (!verbose) {
      console.log(`  Bundled: ${bundleCount}/${totalToBundle} packages`)
    }
  }

  // Phase 4: Docker build (if requested)
  let dockerBuildResults = []
  if (doDockerBuild && totalToDockerBuild > 0) {
    if (!verbose) {
      console.log(`\n  Phase 4: Docker building ${totalToDockerBuild} packages...`)
    } else {
      console.log(`\n  Phase 4: Docker building...`)
    }

    let dockerCount = 0
    for (const wave of dockerBuildWaves) {
      for (const project of wave) {
        const node = graph.get(project.name)
        const projectWithNode = { ...project, _node: node }

        const result = await runDockerBuild(projectWithNode, verbose)
        dockerBuildResults.push({ project, ...result })

        if (result.success) {
          dockerCount++
          if (verbose) {
            const timeInfo = result.time ? ` in ${Math.round(result.time / 1000)}s` : ''
            console.log(`    ${project.name} docker built${timeInfo}`)
          }
        } else {
          console.error(`    ${project.name} docker build failed: ${result.error?.message || 'Unknown error'}`)
        }
      }
    }

    if (!verbose) {
      console.log(`  Docker built: ${dockerCount}/${totalToDockerBuild} packages`)
    }
  }

  // Convert results map to array
  const allResults = [...streamingResults.values()]

  const compiled = allResults.filter((r) => !r.skipped && !r.error && r.filesCount > 0).length
  const validated = allResults.filter((r) => r.validated).length
  const validationCacheHits = allResults.filter((r) => r.validationSkipped).length
  const totalFiles = allResults.reduce((sum, r) => sum + (r.filesCount || 0), 0)
  const skipped = projects.length - totalToTranspile
  const bundled = bundleResults.filter(r => r.success && !r.skipped).length
  const dockerBuilt = dockerBuildResults.filter(r => r.success).length
  const errorResults = allResults.filter((r) => r.error !== undefined)
  const bundleErrors = bundleResults.filter(r => !r.success)
  const dockerErrors = dockerBuildResults.filter(r => !r.success)
  const errors = errorResults.length + bundleErrors.length + dockerErrors.length
  const totalTime = performance.now() - startTime
  const totalCpuTime = allResults.reduce((sum, r) => sum + (r.time || 0), 0)

  // Stop memory tracking and get final peak
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval)
    updatePeakMemory()
  }

  // Stop CPU tracking and get stats
  cpuTracker.stop()
  const cpuStats = cpuTracker.getStats()

  // Print errors if any
  if (errorResults.length > 0 || bundleErrors.length > 0 || dockerErrors.length > 0) {
    console.error(`\nErrors:`)
    for (const result of errorResults) {
      console.error(`  ${result.project.name}: ${result.error.message}`)
    }
    for (const result of bundleErrors) {
      console.error(`  ${result.project.name} (bundle): ${result.error?.message || 'Unknown error'}`)
    }
    for (const result of dockerErrors) {
      console.error(`  ${result.project.name} (docker): ${result.error?.message || 'Unknown error'}`)
    }
  }

  // Print detailed errors if any (verbose mode)
  if (errorResults.length > 0 && verbose) {
    console.log('\n--- Detailed Errors ---')
    for (const result of errorResults) {
      console.error(`\n${result.project.name}:`)
      console.error(result.error)
    }
  }

  return {
    success: errors === 0,
    compiled,
    validated,
    validationCacheHits,
    bundled,
    dockerBuilt,
    totalFiles,
    skipped,
    errors,
    transpileWaves: transpileWaves.length,
    validateWaves: validateWaves.length,
    bundleWaves: bundleWaves.length,
    dockerBuildWaves: dockerBuildWaves.length,
    time: totalTime,
    cpuTime: totalCpuTime,
    phaseBuildStats,
    phaseValidateStats,
    phaseBundleStats,
    phaseDockerBuildStats,
    // Worker and memory info
    workerCount: effectiveParallel,
    requestedWorkers: parallel,
    limitedByMemory: memoryInfo.limitedByMemory,
    forceWorkers,
    initialMemoryMB,
    peakMemoryMB,
    workerPoolPeakMemoryMB: Math.round(workerPoolPeakMemoryMB / 1024 / 1024), // Convert from bytes
    // CPU stats
    cpuStats,
    // Worker timing stats
    workerTimingStats
  }
}

async function main() {
  const args = process.argv.slice(2)
  const { parallel, verbose, doValidate, noCache, doBundle, doDockerBuild, help, list, toPackage, rootDir: rootDirArg, forceWorkers } = parseArgs(args)

  if (help) {
    printUsage()
    process.exit(0)
  }

  if (!rootDirArg) {
    console.error('Error: rootDir argument is required')
    printUsage()
    process.exit(1)
  }

  const rootDir = resolve(rootDirArg)

  if (!existsSync(join(rootDir, 'rush.json'))) {
    console.error(`Error: rush.json not found in ${rootDir}`)
    process.exit(1)
  }

  console.log('Getting Rush project list and building dependency graph...')

  try {
    const result = await compileAll(rootDir, {
      parallel,
      verbose,
      doValidate,
      noCache,
      doBundle,
      doDockerBuild,
      list,
      toPackage,
      forceWorkers
    })

    if (result.listOnly) {
      // Already printed in list mode
      process.exit(0)
    }

    // Print summary
    console.log(`\n--- Summary ---`)
    console.log(`Compiled: ${result.compiled} packages (${result.totalFiles} files) in ${result.transpileWaves} waves`)
    if (doValidate) {
      const cacheInfo = result.validationCacheHits > 0 ? ` (${result.validationCacheHits} cached)` : ''
      console.log(`Validated: ${result.validated} packages${cacheInfo} in ${result.validateWaves} waves`)
    }
    if (doBundle && result.bundled > 0) {
      console.log(`Bundled: ${result.bundled} packages in ${result.bundleWaves} waves`)
    }
    if (doDockerBuild && result.dockerBuilt > 0) {
      console.log(`Docker built: ${result.dockerBuilt} packages in ${result.dockerBuildWaves} waves`)
    }
    console.log(`Skipped: ${result.skipped}`)
    console.log(`Errors: ${result.errors}`)
    console.log(`Wall time: ${Math.round(result.time / 10) / 100}s, CPU time: ${Math.round(result.cpuTime / 10) / 100}s`)

    // Print worker and memory info
    console.log(`\n--- Resource Usage ---`)
    let workerLimitInfo = ''
    if (result.forceWorkers && result.limitedByMemory) {
      workerLimitInfo = ' (forced, ignoring memory limit)'
    } else if (result.limitedByMemory) {
      workerLimitInfo = ` (limited from ${result.requestedWorkers} due to memory)`
    }
    console.log(`Workers: ${result.workerCount}${workerLimitInfo}`)
    console.log(`Initial available memory: ${result.initialMemoryMB} MB`)
    console.log(`Peak process memory: ${result.peakMemoryMB} MB`)
    if (doValidate && result.workerPoolPeakMemoryMB > 0) {
      console.log(`Peak worker pool memory: ${result.workerPoolPeakMemoryMB} MB`)
    }
    // Print CPU stats
    if (result.cpuStats) {
      console.log(`CPU usage: avg ${result.cpuStats.avg}%, peak ${result.cpuStats.peak}% (${result.cpuStats.samples} samples)`)
    }

    // Print worker timing stats
    if (result.workerTimingStats && result.workerTimingStats.totalTasks > 0) {
      const ts = result.workerTimingStats
      console.log(`\n--- Worker Timing Stats ---`)
      console.log(`Total tasks: ${ts.totalTasks}`)
      console.log(`Avg idle time per task: ${Math.round(ts.avgIdleTimePerTask)}ms`)
      console.log(`Avg work time per task: ${Math.round(ts.avgWorkTimePerTask)}ms`)
      console.log(`Overall utilization: ${ts.overallUtilization.toFixed(1)}%`)
      console.log(`Per-worker breakdown:`)
      for (const w of ts.perWorker) {
        console.log(`  Worker ${w.workerId}: ${w.taskCount} tasks, idle ${Math.round(w.idleTime)}ms, work ${Math.round(w.workTime)}ms, util ${w.utilization.toFixed(1)}%`)
      }
    }

    // Print phase statistics
    console.log('\n--- Packages by _phase:build ---')
    const sortedBuildPhases = Object.entries(result.phaseBuildStats).sort((a, b) => b[1] - a[1])
    for (const [phase, count] of sortedBuildPhases) {
      const isSupported = phase === 'compile transpile src' ||
                          phase === 'compile transpile tests' ||
                          phase === 'compile ui-esbuild'
      const marker = isSupported ? ' ✓' : ''
      console.log(`  ${phase}: ${count}${marker}`)
    }

    if (doValidate) {
      console.log('\n--- Packages by _phase:validate ---')
      const sortedValidatePhases = Object.entries(result.phaseValidateStats).sort((a, b) => b[1] - a[1])
      for (const [phase, count] of sortedValidatePhases) {
        const marker = phase === 'compile validate' ? ' ✓' : ''
        console.log(`  ${phase}: ${count}${marker}`)
      }
    }

    if (doBundle) {
      console.log('\n--- Packages by _phase:bundle ---')
      const sortedBundlePhases = Object.entries(result.phaseBundleStats).sort((a, b) => b[1] - a[1])
      for (const [phase, count] of sortedBundlePhases) {
        const marker = phase.includes('bundle') && phase !== '(none)' ? ' ✓' : ''
        console.log(`  ${phase}: ${count}${marker}`)
      }
    }

    if (doDockerBuild) {
      console.log('\n--- Packages by _phase:docker-build ---')
      const sortedDockerPhases = Object.entries(result.phaseDockerBuildStats).sort((a, b) => b[1] - a[1])
      for (const [phase, count] of sortedDockerPhases) {
        const marker = phase.includes('docker') ? ' ✓' : ''
        console.log(`  ${phase}: ${count}${marker}`)
      }
    }

    if (!result.success) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err)
  process.exit(1)
})

module.exports = { compileAll, buildDependencyGraph, topologicalSortWaves, getAllDependencies }
