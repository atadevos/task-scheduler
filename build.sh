#!/bin/bash

# 🐳 Task Scheduler - Docker Rebuild Script
# Comprehensive rebuild script with multiple options for different scenarios

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_VERSION="2.0.0"
DEFAULT_MODE="all"

# Help function
show_help() {
    echo -e "${CYAN}🐳 Task Scheduler - Docker Build Script v${SCRIPT_VERSION}${NC}"
    echo ""
    echo "USAGE:"
    echo "    ./build.sh [OPTIONS] [MODE]"
    echo ""
    echo "MODES:"
    echo "    all          Rebuild all services (default)"
    echo "    backend      Rebuild only backend"
    echo "    frontend     Rebuild only frontend"
    echo ""
    echo "OPTIONS:"
    echo "    -f, --fast      Use Docker cache for faster builds"
    echo "    -c, --clean     Clean rebuild (remove containers and images)"
    echo "    -d, --database  Reinitialize database (implies clean)"
    echo "    -h, --help      Show this help message"
    echo "    -v, --version   Show version information"
    echo ""
    echo "EXAMPLES:"
    echo "    ./build.sh                    # Full rebuild (default)"
    echo "    ./build.sh --fast             # Fast rebuild using cache"
    echo "    ./build.sh --clean            # Clean rebuild, remove old containers"
    echo "    ./build.sh backend --fast     # Fast backend-only rebuild"
    echo "    ./build.sh --database         # Full rebuild with database reset"
    echo ""
    echo "NOTES:"
    echo "    - Database reinitialization (--database) removes all data"
    echo "    - Clean rebuild removes old containers and images"
    echo "    - Fast rebuild is much quicker for code-only changes"
    echo ""
}

# Version function
show_version() {
    echo -e "${CYAN}🐳 Task Scheduler - Docker Build Script v${SCRIPT_VERSION}${NC}"
    echo "Unified script for all Docker build operations"
}

# Error handler
cleanup_on_error() {
    echo -e "\n${RED}❌ Build failed!${NC}"
    echo -e "${YELLOW}💡 Troubleshooting tips:${NC}"
    echo "   1. Check Docker is running: docker ps"
    echo "   2. Check logs: docker-compose logs [service]"
    echo "   3. Try cleaning Docker: docker system prune -a"
    echo "   4. Check disk space: df -h"
    echo "   5. For npm errors, the Dockerfile handles them automatically"
    exit 1
}

# Success information
show_success_info() {
    echo -e "\n${GREEN}🎉 Rebuild Complete!${NC}"
    echo ""
    echo -e "${CYAN}📋 ACCESS INFORMATION:${NC}"
    echo -e "   🌐 Frontend:    ${YELLOW}http://localhost:5173${NC}"
    echo -e "   🚀 Backend:     ${YELLOW}http://localhost:3000${NC}"
    echo -e "   📊 API Docs:    ${YELLOW}http://localhost:3000/api${NC}"
    echo -e "   🏥 Health:      ${YELLOW}http://localhost:3000/health${NC}"
    echo ""
    echo -e "${CYAN}👥 DEFAULT USERS CREATED:${NC}"
    echo -e "   👑 Admin:       ${YELLOW}admin@example.com${NC}     | Password: ${YELLOW}123456${NC}"
    echo -e "   👔 Manager1:    ${YELLOW}manager1@example.com${NC}  | Password: ${YELLOW}123456${NC}"
    echo -e "   👔 Manager2:    ${YELLOW}manager2@example.com${NC}  | Password: ${YELLOW}123456${NC}"
    echo -e "   👤 User1:       ${YELLOW}user1@example.com${NC}     | Password: ${YELLOW}123456${NC}"
    echo -e "   👤 User2:       ${YELLOW}user2@example.com${NC}     | Password: ${YELLOW}123456${NC}"
    echo ""
    echo -e "${CYAN}📝 USEFUL COMMANDS:${NC}"
    echo -e "   📋 View status:     ${YELLOW}docker-compose ps${NC}"
    echo -e "   📜 View logs:       ${YELLOW}docker-compose logs -f [service]${NC}"
    echo -e "   🔄 Restart service: ${YELLOW}docker-compose restart [service]${NC}"
    echo -e "   🧪 Run tests:       ${YELLOW}./run-tests.sh${NC}"
    echo ""
    echo -e "${GREEN}✨ Happy coding!${NC}"
}

# Parse command line arguments
FAST_MODE=false
CLEAN_MODE=false
DATABASE_RESET=false
TARGET_MODE="all"

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--fast)
            FAST_MODE=true
            shift
            ;;
        -c|--clean)
            CLEAN_MODE=true
            shift
            ;;
        -d|--database)
            DATABASE_RESET=true
            CLEAN_MODE=true  # Database reset implies clean
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--version)
            show_version
            exit 0
            ;;
        all|backend|frontend)
            TARGET_MODE="$1"
            shift
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            echo "Use --help for usage information."
            exit 1
            ;;
    esac
done

# Set trap for error handling
trap cleanup_on_error ERR

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo "Please start Docker and try again."
    exit 1
fi

echo -e "${BLUE}🐳 Task Scheduler - Docker Build Script v${SCRIPT_VERSION}${NC}"
echo ""

# Determine what we're building
case $TARGET_MODE in
    all)
        TARGET_SERVICES="frontend backend"
        TARGET_DESC="all services"
        ;;
    backend)
        TARGET_SERVICES="backend"
        TARGET_DESC="backend only"
        ;;
    frontend)
        TARGET_SERVICES="frontend"
        TARGET_DESC="frontend only"
        ;;
esac

# Show build configuration
echo -e "${YELLOW}📋 BUILD CONFIGURATION:${NC}"
echo -e "   Target:     ${CYAN}$TARGET_DESC${NC}"
echo -e "   Fast mode:  ${CYAN}$FAST_MODE${NC}"
echo -e "   Clean mode: ${CYAN}$CLEAN_MODE${NC}"
echo -e "   DB reset:   ${CYAN}$DATABASE_RESET${NC}"
echo ""

# Enable Docker BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Clean operations (if requested)
if [ "$CLEAN_MODE" = true ]; then
    echo "🧹 Performing clean operations..."

    if [ "$DATABASE_RESET" = true ] && [ "$TARGET_MODE" = "all" ] || [ "$TARGET_MODE" = "backend" ]; then
        echo "   🗄️  Stopping database..."
        docker-compose stop mysql redis || true

        echo "   🗑️  Removing database containers..."
        docker-compose rm -f mysql redis 2>/dev/null || true

        echo "   🧽 Removing database volumes..."
        # Find and remove database volumes
        MYSQL_VOLUME=$(docker volume ls -q | grep mysql_data | head -1)
        REDIS_VOLUME=$(docker volume ls -q | grep redis_data | head -1)

        if [ -n "$MYSQL_VOLUME" ]; then
            echo "      Removing MySQL volume: $MYSQL_VOLUME"
            docker volume rm "$MYSQL_VOLUME" 2>/dev/null || true
        fi

        if [ -n "$REDIS_VOLUME" ]; then
            echo "      Removing Redis volume: $REDIS_VOLUME"
            docker volume rm "$REDIS_VOLUME" 2>/dev/null || true
        fi
    else
        echo "   🛑 Stopping containers..."
        docker-compose stop $TARGET_SERVICES || true

        echo "   🗑️  Removing old containers..."
        docker-compose rm -f $TARGET_SERVICES 2>/dev/null || true
    fi

    echo "   🖼️  Removing old images..."
    for service in $TARGET_SERVICES; do
        docker rmi "task-scheduler -$service" 2>/dev/null || true
    done
fi

# Build operations
BUILD_ARGS=""
if [ "$FAST_MODE" = false ]; then
    BUILD_ARGS="--no-cache"
    echo "🔨 Building $TARGET_DESC (no cache)..."
else
    echo "🚀 Fast building $TARGET_DESC (using cache)..."
fi

if ! docker-compose build $BUILD_ARGS $TARGET_SERVICES; then
    echo -e "${RED}❌ Build failed!${NC}"
    echo -e "${YELLOW}📜 Last 50 lines of build output:${NC}"
    docker-compose build $BUILD_ARGS $TARGET_SERVICES 2>&1 | tail -50 || true
    exit 1
fi

# Start operations
echo "🚀 Starting services..."
if [ "$DATABASE_RESET" = true ] && [ "$TARGET_MODE" = "all" ] || [ "$TARGET_MODE" = "backend" ]; then
    echo "   Starting database first..."
    docker-compose up -d mysql redis
    echo "   Waiting for database to be ready..."
    sleep 5
fi

docker-compose up -d $TARGET_SERVICES

# Show status
echo ""
echo "📋 Container status:"
docker-compose ps $TARGET_SERVICES

# Show success information
show_success_info
