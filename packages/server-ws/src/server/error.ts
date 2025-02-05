export class ApiError extends Error {
    constructor (
        readonly code: string,
        readonly message: string
    ) {
        super(message)
    }
}