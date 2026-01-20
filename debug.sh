#!/bin/bash

# Debug Helper Script for my-wedding-app
# Usage: ./debug.sh [command]

set -e

COMPOSE_CMD="docker-compose -f docker-compose.yml -f docker-compose.debug.yml"

case "$1" in
  start)
    echo "🚀 Starting debug stack..."
    $COMPOSE_CMD up -d
    echo "✅ Stack started. Waiting for backend to be ready..."
    sleep 5
    $COMPOSE_CMD logs backend | tail -n 20
    echo ""
    echo "📡 Debugger listening on localhost:5678"
    echo "💡 Press F5 in VS Code to attach debugger"
    ;;
    
  stop)
    echo "🛑 Stopping debug stack..."
    $COMPOSE_CMD down
    echo "✅ Stack stopped"
    ;;
    
  restart)
    echo "🔄 Restarting backend container..."
    $COMPOSE_CMD restart backend
    echo "✅ Backend restarted"
    ;;
    
  logs)
    echo "📋 Showing backend logs (Ctrl+C to exit)..."
    $COMPOSE_CMD logs -f backend
    ;;
    
  rebuild)
    echo "🏗️  Rebuilding backend container..."
    $COMPOSE_CMD up -d --build backend
    echo "✅ Backend rebuilt and started"
    ;;
    
  shell)
    echo "🐚 Opening shell in backend container..."
    $COMPOSE_CMD exec backend /bin/bash
    ;;
    
  test)
    echo "🧪 Running backend tests..."
    $COMPOSE_CMD exec backend python manage.py test
    ;;
    
  migrate)
    echo "📦 Running Django migrations..."
    $COMPOSE_CMD exec backend python manage.py migrate
    ;;
    
  status)
    echo "📊 Current stack status:"
    $COMPOSE_CMD ps
    echo ""
    echo "🔌 Exposed ports:"
    docker ps --filter "name=backend" --format "table {{.Names}}\t{{.Ports}}"
    ;;
    
  clean)
    echo "🧹 Cleaning up debug artifacts..."
    $COMPOSE_CMD down -v
    echo "✅ All volumes and containers removed"
    ;;
    
  help|*)
    echo "Debug Helper for my-wedding-app"
    echo ""
    echo "Usage: ./debug.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start      Start debug stack (backend with debugpy listening on 5678)"
    echo "  stop       Stop debug stack"
    echo "  restart    Restart backend container"
    echo "  logs       Show backend logs (follow mode)"
    echo "  rebuild    Rebuild backend container (after requirements/Dockerfile changes)"
    echo "  shell      Open bash shell in backend container"
    echo "  test       Run Django tests"
    echo "  migrate    Run Django migrations"
    echo "  status     Show current stack status and ports"
    echo "  clean      Stop stack and remove all volumes"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./debug.sh start       # Start debug stack"
    echo "  ./debug.sh logs        # Watch logs"
    echo "  ./debug.sh shell       # Open shell for manual debugging"
    echo ""
    ;;
esac
