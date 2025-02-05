export interface Logger {
    log: (message: string, data?: Record<string, any>) => void
    warn: (message: string, data?: Record<string, any>) => void
    error: (message: string, data?: Record<string, any>) => void
    debug: (message: string, data?: Record<string, any>) => void
}

export class ConsoleLogger implements Logger {
    log (message: string, data?: Record<string, any>): void {
        console.log({ message, ...data })
    }

    warn (message: string, data?: Record<string, any>): void {
        console.warn({ message, ...data })
    }

    error (message: string, data?: Record<string, any>): void {
        console.error({ message, ...data })
    }

    debug (message: string, data?: Record<string, any>): void {
        console.debug({ message, ...data })
    }
}