#!/bin/bash

# Script di automazione per l'esecuzione completa della Test Suite
# Project: My-Wedding-App
# Author: AI DevOps Architect

set -e # Interrompe l'esecuzione se un comando fallisce

# Default values
CLEAN_ONLY=false
DETACH=false

# Parse arguments
for arg in "$@"
do
    case $arg in
        --clean_only)
        CLEAN_ONLY=true
        shift
        ;;
    esac
    case $arg in
        --detach)
        DETACH=true
        shift
        ;;
    esac
done

# Pulire tutti i container docker
echo "--------------------------------------------------------"
echo "  [1/4] Killo eventuali Container Attivi..."
echo "--------------------------------------------------------"
# Recupera gli ID dei container in esecuzione
CONTAINERS=$(docker ps -q)

if [ -z "$CONTAINERS" ]; then
    echo "Nessun container in esecuzione da terminare."
else
    echo "Terminazione dei container in corso..."
    docker kill $CONTAINERS
fi
echo "--------------------------------------------------------"
echo "  [2/4] Elimino eventuali Container Esistenti..."
echo "--------------------------------------------------------"
CONTAINERS=$(docker ps -a -q)
if [ -z "$CONTAINERS" ]; then
    echo "Nessun container da eliminare."
else
    echo "Eliminazione dei container in corso..."
    docker rm $CONTAINERS
fi
echo "--------------------------------------------------------"
echo "  [3/4] Elimino eventuali Reti Esistenti..."
echo "--------------------------------------------------------"
CONTAINERS=$(docker network ls --filter "type=custom" -q)
if [ -z "$CONTAINERS" ]; then
    echo "Nessuna rete da eliminare."
else
    echo "Eliminazione delle reti in corso..."
    docker network rm $CONTAINERS
fi


if [ "$CLEAN_ONLY" = false ]; then
    # Avviare il progetto in dev mode con hot-reload
    echo "--------------------------------------------------------"
    echo "  [4/4] Avvio il progetto in dev mode con hot-reload..."
    echo "--------------------------------------------------------"
    if [ "$DETACH" = false ]; then
        docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
    else
        docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build --detach
    fi
fi