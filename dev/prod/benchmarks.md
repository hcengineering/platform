# Webpack vs Rspack Benchmarks (Huly Monorepo)

This file tracks the performance metrics for the transition from Webpack to Rspack.

## 1. Full Builds & Initial Startup

| Metric | Webpack (Original) | Rspack (New) | Improvement |
| :--- | :--- | :--- | :--- |
| **Production Build** (`package` vs `rs:build`) | 2m 50s (170s) | **47s** | **~3.6x** |
| **Dev Server Cold Start** | 1m 00s (60s) | **43s** | **~1.4x** |

> [!NOTE]
> Cold start improvement is lower because Rspack is now correctly bundling **all** dynamic resources upfront to prevent the "refresh waterfall."

## 2. Hot Module Replacement (HMR)

| Metric | Webpack | Rspack | Improvement |
| :--- | :--- | :--- | :--- |
| **Single Component Recompile** | 16.2s | **0.8s** | **~20x** |

---
*Last updated: 2026-03-01*
