# AnyCode Sandbox Image
# Base image for running Claude Code in isolated containers

FROM ubuntu:22.04

LABEL maintainer="Jacky <newbdez33@gmail.com>"
LABEL description="AnyCode Sandbox - Isolated Claude Code environment"

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install base dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    vim \
    nano \
    build-essential \
    python3 \
    python3-pip \
    ca-certificates \
    gnupg \
    lsb-release \
    sudo \
    locales \
    && rm -rf /var/lib/apt/lists/*

# Set up locale
RUN locale-gen en_US.UTF-8
ENV LANG=en_US.UTF-8
ENV LANGUAGE=en_US:en
ENV LC_ALL=en_US.UTF-8

# Install Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

# Install Claude Code CLI
RUN npm install -g @anthropic-ai/claude-code

# Create non-root user for development
RUN useradd -m -s /bin/bash -G sudo developer \
    && echo "developer ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set working directory
WORKDIR /workspace

# Change ownership of workspace to developer
RUN chown -R developer:developer /workspace

# Switch to non-root user
USER developer

# Set up git config template
RUN git config --global init.defaultBranch main \
    && git config --global core.editor "vim"

# Health check - verify Claude Code is installed
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD claude --version || exit 1

# Default command
ENTRYPOINT ["/bin/bash"]
