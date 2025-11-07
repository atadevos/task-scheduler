# Winston Logger Usage Guide

## Overview

The backend uses Winston for advanced logging with different log levels. The logger is configured to output colored console logs in development and structured JSON logs to files in production.

## Log Levels

The logger supports the following levels (from lowest to highest priority):

1. **error** - Error events that might still allow the application to continue
2. **warn** - Warning messages for potentially harmful situations
3. **info** - Informational messages highlighting the progress of the application
4. **debug** - Detailed information for debugging
5. **verbose** - Very detailed information

## Configuration

Set the log level using the `LOG_LEVEL` environment variable:

```env
LOG_LEVEL=info  # Options: error, warn, info, debug, verbose
```

## Usage in Services

### Basic Usage

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { AppLogger } from '../logger/logger.service';

@Injectable()
export class MyService {
  constructor(
    @Inject(AppLogger) private readonly logger: AppLogger,
  ) {}

  someMethod() {
    // Info level
    this.logger.info('Operation completed', 'MyService');

    // Debug level
    this.logger.debug('Processing data', 'MyService');

    // Warning level
    this.logger.warn('Potential issue detected', 'MyService');

    // Error level
    this.logger.error('Operation failed', error.stack, 'MyService');

    // With metadata
    this.logger.info('User logged in', 'MyService', {
      userId: user.id,
      email: user.email,
    });
  }
}
```

### Log Levels Explained

- **`logger.error()`** - Use for errors and exceptions
- **`logger.warn()`** - Use for warnings (e.g., failed validations, blocked operations)
- **`logger.info()`** - Use for important business events (e.g., user login, task creation)
- **`logger.debug()`** - Use for detailed debugging information
- **`logger.verbose()`** - Use for very detailed tracing

## Production Logging

In production mode (`NODE_ENV=production`), logs are written to:

- `logs/error.log` - Only error level logs
- `logs/combined.log` - All logs
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

Log files are rotated automatically:
- Maximum file size: 5MB
- Maximum files kept: 5

## Development Logging

In development mode, logs are output to the console with:
- Colorized output
- Timestamps
- Context information
- Readable format

## Examples

### Authentication Service

```typescript
this.logger.info(`Login attempt for: ${email}`, 'AuthService');
this.logger.warn(`Failed login attempt for: ${email}`, 'AuthService');
this.logger.info(`Successful login for user: ${email}`, 'AuthService', {
  userId: user.id,
  role: user.role,
});
```

### Tasks Service

```typescript
this.logger.debug(`Fetching tasks with filters`, 'TasksService');
this.logger.info(`Task created successfully: ${taskId}`, 'TasksService', {
  taskId,
  assignedUserId,
});
this.logger.warn(`Task creation blocked: overlapping task`, 'TasksService', {
  assignedUserId,
  startDate,
  endDate,
});
```

## Best Practices

1. **Use appropriate log levels** - Don't log everything as `info`
2. **Include context** - Always provide a context string (service/class name)
3. **Add metadata** - Include relevant data for debugging (IDs, parameters, etc.)
4. **Don't log sensitive data** - Never log passwords, tokens, or PII
5. **Use structured logging** - Pass metadata as objects for better querying

