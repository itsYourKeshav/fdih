export class AppError extends Error {
    constructor(public message: string, public statusCode: number) {
        super(message);
        this.name = 'AppError';
    }
}
export class NotFoundError extends AppError {
    constructor(msg = 'Not found') { super(msg, 404); }
}
export class ValidationError extends AppError {
    constructor(msg: string) { super(msg, 400); }
}
export class ExtractionError extends AppError {
    constructor(msg: string) { super(msg, 422); }
}
