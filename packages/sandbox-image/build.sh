#!/bin/bash

# Build script for AnyCode Sandbox Docker image

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="anycode/sandbox"
IMAGE_TAG="${1:-latest}"

echo "Building AnyCode Sandbox image..."
echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}"

docker build \
    -t "${IMAGE_NAME}:${IMAGE_TAG}" \
    -f "${SCRIPT_DIR}/Dockerfile" \
    "${SCRIPT_DIR}"

echo ""
echo "Build complete!"
echo "Run: docker run -it --rm ${IMAGE_NAME}:${IMAGE_TAG}"
