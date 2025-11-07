# Task Scheduler

A lightweight internal task scheduling platform where managers can create and assign tasks, set deadlines and statuses, and track user availability with strict no-overlap rules.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ (for local development)

### Default Admin Credentials
- **Email**: `admin@example.com`
- **Password**: `123456`

### Initial Data
The application automatically seeds the database with test user accounts from `backend/config/initial-data.json`:

| Role | Email | Name | Password |
|------|-------|------|----------|
| 👑 Admin | `admin@example.com` | Admin User | `123456` |
| 👔 Manager | `manager1@example.com` | Manager One | `123456` |
| 👔 Manager | `manager2@example.com` | Manager Two | `123456` |
| 👤 User | `user1@example.com` | User One | `123456` |
| 👤 User | `user2@example.com` | User Two | `123456` |

**All accounts share the same password: `123456`**

### Build from Source

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd task-scheduler
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` if needed (defaults should work for local development)

3. **Build all services**
   ```bash
   ./build.sh
   ```

4. **Access the application**
   - **Frontend**: http://localhost:5173
   - **Backend API**: http://localhost:3000/api
   - **Health Check**: http://localhost:3000/health

## 🧪 Testing

### Run All Tests
```bash
./run-tests.sh
```

This automatically:
- ✅ Checks system dependencies (Node.js, npm, Docker)
- ✅ Installs packages if needed
- ✅ Runs unit tests (38 tests - fast, no DB required)
- ✅ Checks database availability
- ✅ Runs integration tests if DB available (25 tests)
- ✅ Generates coverage reports

### Individual Test Commands

#### Backend Tests
```bash
cd backend

# Unit tests only (fast)
npm test

# All tests (unit + integration, requires DB)
npm run test:all

# Watch mode for development
npm run test:watch

# With coverage reports
npm run test:cov

# Integration tests only (requires DB)
npm run test:e2e
```

### Test Coverage
- **Unit Tests**: 38 tests covering all CRUD operations
- **Integration Tests**: 25 tests covering full API workflows
- **Security Testing**: JWT auth, role-based permissions
- **Error Handling**: All major error scenarios

## 📋 API Overview

### Authentication
- `POST /api/auth/login` - Login and get JWT token

### Tasks
- `GET /api/tasks` - List all tasks (with filters)
- `GET /api/tasks/:id` - Get a single task
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update a task
- `PUT /api/tasks/:id/reassign` - Reassign a task
- `DELETE /api/tasks/:id` - Delete a task

### Users
- `GET /api/users` - List all users

### Statuses
- `GET /api/statuses` - List all task statuses

**Note**: All endpoints except `/api/auth/login` require JWT authentication.

## 🏗️ Tech Stack

- **Backend**: NestJS, TypeORM, MySQL, Redis, Bull (job queue), JWT, Winston (logging)
- **Frontend**: Vue.js 3, TypeScript, Pinia, Vue Router, Tailwind CSS
- **Database**: MySQL 8.4 with optimized indexes and full-text search
- **Containerization**: Docker & Docker Compose with multi-stage builds

## 🔧 Development

### Build Scripts
```bash
./build.sh              # Full rebuild from scratch
./build.sh --fast       # Fast rebuild using cache
./build.sh --clean      # Clean rebuild (remove containers)
./build.sh --database   # Full rebuild with database reset
```

### Development Workflow
1. **Code changes**: `docker-compose restart backend` (instant)
2. **Dependencies**: `./build.sh backend --fast` (fast, uses cache)
3. **Dockerfile**: `./build.sh backend` (full rebuild)

### Database Schema
- **Users**: Authentication and role management
- **Tasks**: Task management with user assignments
- **Statuses**: Task status definitions
- **Optimized indexes**: Performance-tuned for common queries

### Availability Rules
- **No overlap**: Users cannot have overlapping tasks
- **Single assignment**: Each task assigned to one user
- **Background jobs**: Asynchronous availability updates via Redis/Bull

### Logging
- **Winston framework**: Structured logging with multiple levels
- **File rotation**: Automatic log rotation and cleanup
- **Environment-based**: Console in dev, files in production

## 🔧 Troubleshooting

### Database Issues
- **Container not running**: `docker-compose ps`
- **Connection failed**: Check credentials in `.env`
- **Port conflict**: Ensure 3306 is available

### Redis Issues
- **Container not running**: `docker-compose ps`
- **Connection failed**: Check Redis host/port

### Frontend Issues
- **Backend not accessible**: Verify port 3000 is available
- **CORS errors**: Check browser console
- **API URL**: Verify `VITE_API_BASE_URL`

### Authentication Issues
- **JWT secret**: Check `JWT_SECRET` in `.env`
- **Token storage**: Clear browser localStorage
- **Token expired**: Re-login to get new token

### Build Issues
- **Docker problems**: `docker system prune -a`
- **Cache issues**: `./build.sh --clean`
- **Dependencies**: Delete `node_modules` and rebuild

## 📊 Performance

- **Fast rebuilds**: ~30 seconds (with cache)
- **Clean rebuilds**: ~5-10 minutes
- **Tests**: ~30 seconds for unit, ~10-30 seconds for integration
- **Hot reload**: Instant for code changes

## 📄 License

ISC

