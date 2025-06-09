#!/bin/sh

PROCESS_TYPE=${1:-server}

case "$PROCESS_TYPE" in
  "server")
    echo "Starting server..."
    exec node dist/server/app.js
    ;;
  "worker")
    echo "Starting worker..."
    exec node dist/queues/process.js
    ;;
  *)
    echo "Invalid PROCESS_TYPE: $PROCESS_TYPE"
    echo "Valid options: server, worker"
    exit 1
    ;;
esac
