import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLogger } from '../../logger/logger.service';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message,
    };

    // Log validation errors and other client errors
    if (status === HttpStatus.BAD_REQUEST) {
      this.logger.warn(
        `Validation error: ${JSON.stringify(errorResponse)}`,
        'ValidationPipe',
        {
          body: request.body,
          query: request.query,
          params: request.params,
        },
      );
    } else if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Server error: ${exception.message}`,
        exception.stack,
        'HttpExceptionFilter',
      );
      // Log additional details as a separate warn log
      this.logger.warn(
        `Server error details`,
        'HttpExceptionFilter',
        {
          ...errorResponse,
          stack: exception.stack,
        },
      );
    } else {
      this.logger.warn(
        `HTTP ${status}: ${errorResponse.message}`,
        'HttpExceptionFilter',
        errorResponse,
      );
    }

    response.status(status).json(errorResponse);
  }
}

