# DOCKER HANDBOOK
### Complete Guide — From Zero to Production

> This handbook teaches Docker from first principles through advanced usage,
> then applies every concept to the Neon Runner project you just built.

---

## Table of Contents

1. [What Is Docker and Why It Exists](#1-what-is-docker-and-why-it-exists)
2. [How Docker Works — The Architecture](#2-how-docker-works--the-architecture)
3. [Images — The Blueprint](#3-images--the-blueprint)
4. [Containers — The Running Instance](#4-containers--the-running-instance)
5. [The Dockerfile — Building Images](#5-the-dockerfile--building-images)
6. [Layer Caching — The Performance System](#6-layer-caching--the-performance-system)
7. [Docker CLI — Every Command You Need](#7-docker-cli--every-command-you-need)
8. [Networking — How Containers Talk](#8-networking--how-containers-talk)
9. [Volumes and Storage — Persisting Data](#9-volumes-and-storage--persisting-data)
10. [Docker Compose — Multi-Container Apps](#10-docker-compose--multi-container-apps)
11. [Security — Running Docker Safely](#11-security--running-docker-safely)
12. [Multi-Stage Builds — Shrinking Images](#12-multi-stage-builds--shrinking-images)
13. [Health Checks, Logging, and Debugging](#13-health-checks-logging-and-debugging)
14. [Production Patterns and Best Practices](#14-production-patterns-and-best-practices)
15. [Neon Runner: Complete Docker Deep Dive](#15-neon-runner-complete-docker-deep-dive)

---

## 1. What Is Docker and Why It Exists

### The Problem Docker Solves

Before Docker, deploying software meant managing this conversation constantly:

> "It works on my machine."
> "Well, your machine isn't the server."

The root cause: software depends on an exact combination of OS libraries, runtime versions, environment variables, and file paths. Two machines configured slightly differently produce different behavior — or outright failures.

The old solutions were clumsy:
- **Documentation**: Write a 40-step setup guide and hope it stays current
- **Virtual Machines**: Works, but a full OS per app consumes gigabytes of RAM and minutes to boot
- **Configuration management** (Ansible, Chef): Complex, drift-prone, hard to reproduce exactly

### What Docker Does

Docker packages an application together with everything it needs to run — its runtime, libraries, config, and code — into a single portable unit called a **container**.

The container runs identically on any machine that has Docker installed, regardless of the host OS.

```
┌────────────────────────────────────────────────┐
│  Your Laptop         Production Server          │
│  ┌──────────┐        ┌──────────┐              │
│  │ Container │        │ Container │  identical  │
│  │  app v1  │   ==   │  app v1  │  behavior   │
│  └──────────┘        └──────────┘              │
│  Docker Engine       Docker Engine             │
│  Linux Kernel        Linux Kernel               │
└────────────────────────────────────────────────┘
```

### Containers vs. Virtual Machines

This is the most important conceptual distinction to understand.

```
Virtual Machines                    Containers
────────────────────────────────    ────────────────────────────────
┌──────────┐  ┌──────────┐         ┌──────────┐  ┌──────────┐
│  App A   │  │  App B   │         │  App A   │  │  App B   │
│          │  │          │         │          │  │          │
│  Libs    │  │  Libs    │         │  Libs    │  │  Libs    │
│          │  │          │         └──────────┘  └──────────┘
│  Guest   │  │  Guest   │         ─────────────────────────
│  OS      │  │  OS      │              Docker Engine
│ (2-5 GB) │  │ (2-5 GB) │         ─────────────────────────
└──────────┘  └──────────┘              Host OS Kernel
─────────────────────────
      Hypervisor
─────────────────────────
        Host OS
─────────────────────────
       Hardware
```

| Property | Virtual Machine | Container |
|----------|----------------|-----------|
| Boot time | 30–120 seconds | Milliseconds |
| Size | 2–20 GB | 5–500 MB |
| Isolation | Full OS-level | Process-level (namespaces) |
| Overhead | High (full kernel) | Near-zero |
| Portability | Heavy | Lightweight |
| Use case | Full OS isolation | App isolation |

**Key insight:** Containers are not VMs. A container is a regular Linux process that is isolated using two kernel features:

1. **Namespaces** — isolate what the process *can see* (its own filesystem, network, process list, hostname)
2. **cgroups** (control groups) — limit what the process *can use* (CPU, RAM, I/O, network)

The container shares the host's kernel. There is no second OS. This is why containers start instantly and use almost no extra RAM beyond what the application itself needs.

### A Brief History

| Year | Event |
|------|-------|
| 2008 | Linux cgroups merged into kernel |
| 2013 | Docker Inc. open-sources Docker (builds on LXC) |
| 2014 | Docker switches from LXC to its own `libcontainer` |
| 2015 | Open Container Initiative (OCI) forms to standardize container format |
| 2016 | Kubernetes 1.0 released, container orchestration goes mainstream |
| 2017 | Docker splits into Moby (open source) + Docker CE/EE |
| 2020 | `containerd` becomes the default container runtime in Kubernetes |
| Today | Containers are the default deployment unit for most software |

---

## 2. How Docker Works — The Architecture

Understanding the architecture explains why Docker commands work the way they do.

```
┌──────────────────────────────────────────────────────────┐
│                    Docker Architecture                    │
│                                                          │
│  ┌─────────┐   REST API   ┌──────────────────────────┐  │
│  │ docker  │ ───────────► │     Docker Daemon        │  │
│  │  CLI    │              │     (dockerd)            │  │
│  └─────────┘              │                          │  │
│                           │  ┌────────────────────┐  │  │
│  ┌─────────┐              │  │    containerd       │  │  │
│  │ Docker  │              │  │  (container mgmt)   │  │  │
│  │ Desktop │ ───────────► │  │                    │  │  │
│  └─────────┘              │  │  ┌──────────────┐  │  │  │
│                           │  │  │   runc       │  │  │  │
│  ┌─────────┐              │  │  │ (OCI runtime)│  │  │  │
│  │ Docker  │              │  │  └──────────────┘  │  │  │
│  │Compose  │              │  └────────────────────┘  │  │
│  └─────────┘              └──────────────────────────┘  │
│                                      │                   │
│                           ┌──────────▼──────────┐        │
│                           │   Linux Kernel       │        │
│                           │  (namespaces/cgroups)│        │
│                           └─────────────────────┘        │
└──────────────────────────────────────────────────────────┘
```

### The Components

**docker CLI**
The command-line tool you type `docker run` into. It is purely a client — it translates your commands into HTTP requests to the Docker daemon's REST API. The CLI does not run containers itself.

**Docker Daemon (dockerd)**
A long-running background process. It receives API calls from the CLI, manages images, and delegates container lifecycle to `containerd`. This is what starts when you start Docker.

**containerd**
An industry-standard container runtime that handles the actual lifecycle: pulling images, creating containers, starting/stopping them. Kubernetes uses containerd directly (bypassing dockerd entirely).

**runc**
The lowest-level piece. It reads an OCI bundle (filesystem + config) and uses Linux kernel syscalls to start the container process with the right namespaces and cgroup limits. `runc` is a tiny CLI tool that you would rarely touch directly.

**Docker Registry**
Where images live. Docker Hub is the public default registry. When you `docker pull node:20`, the daemon fetches it from `registry-1.docker.io`. You can run your own private registry.

### What Happens When You Run `docker run node:20-alpine node --version`

```
1. docker CLI sends POST /containers/create to dockerd via Unix socket
2. dockerd checks: is image node:20-alpine in local cache?
   └── No → dockerd contacts Docker Hub registry
              └── Pulls each layer of the image
3. containerd creates the container's filesystem (union mount)
4. containerd calls runc
5. runc:
   └── creates new namespaces (PID, NET, MNT, UTS, IPC)
   └── sets up cgroup limits
   └── exec()s node --version inside the namespace
6. node --version prints output, exits
7. Container exits, runc reports exit code to containerd
8. dockerd streams stdout/stderr back to docker CLI
```

### The Unix Socket

The docker CLI communicates with the daemon via a Unix domain socket at `/var/run/docker.sock`. This is why:
- Docker commands require `sudo` (or membership in the `docker` group) on Linux — the socket is owned by root
- Mounting `/var/run/docker.sock` into a container gives that container full control over the Docker daemon (a major security consideration)

---

## 3. Images — The Blueprint

An **image** is an immutable, layered filesystem snapshot plus metadata (what command to run, what ports to expose, environment variables). An image is not a running thing — it is the template from which containers are created.

### Image Naming

```
registry/username/repository:tag

Examples:
  node:20-alpine              # Docker Hub official image, tag 20-alpine
  nginx:latest                # Docker Hub official, latest tag
  postgres:16.2               # Pinned version tag
  mycompany/backend:v2.3.1    # Private org image
  ghcr.io/org/app:sha-abc123  # GitHub Container Registry, SHA tag
```

When you omit the registry, Docker Hub is assumed.
When you omit the tag, `latest` is assumed. **Never use `latest` in production** — it changes silently.

### Image Layers

This is fundamental to understanding Docker's storage efficiency.

Every instruction in a Dockerfile creates a new **layer** — a diff (changeset) on top of the previous layer. Layers are:
- **Immutable**: once created, a layer never changes
- **Shared**: if two images use the same base, they share those layers on disk
- **Cached**: building an image reuses layers whose inputs haven't changed

```
Image: node:20-alpine
─────────────────────────────────────────
Layer 5: node/npm binaries        │ 40 MB
Layer 4: npm install              │  8 MB  ← added by Alpine's node package
Layer 3: musl libc, openssl       │ 12 MB
Layer 2: alpine base packages     │  3 MB
Layer 1: alpine minimal rootfs    │  2 MB
─────────────────────────────────────────
Total (compressed): ~65 MB
```

When you build your own image on top of `node:20-alpine`, your layers are added on top:

```
Your application image
─────────────────────────────────────────
Layer 8: COPY . .                 │  2 MB  ← your app code
Layer 7: RUN npm ci               │ 45 MB  ← node_modules
Layer 6: COPY package*.json       │ 0.1 MB
Layer 5: RUN apk add curl...      │  3 MB
Layer 4: WORKDIR /app             │  0 MB  (metadata only)
── shared with node:20-alpine ───────────
Layer 3:  node binaries           │ 40 MB  (cached, not re-downloaded)
Layer 2:  alpine packages         │  5 MB  (cached)
Layer 1:  alpine rootfs           │  2 MB  (cached)
─────────────────────────────────────────
Total on disk: ~97 MB
Layers 1-3 shared with all other alpine-based images
```

### How Layers Are Stored

Docker uses a **Union Filesystem** (UnionFS) — a storage driver that overlays multiple directory trees into a single unified view.

The default storage driver on modern Linux is **overlay2**:

```
Upper layer (writable, per-container)   ← container writes go here
────────────────────────────────────────
Layer 8: app code (read-only)
Layer 7: node_modules (read-only)
Layer 6: package.json (read-only)
Layer 5: apk add result (read-only)
Layer 4: WORKDIR metadata (read-only)
Layer 3: node binaries (read-only)
Layer 2: alpine packages (read-only)
Layer 1: alpine rootfs (read-only)
────────────────────────────────────────
Merged view: looks like one filesystem to the container
```

When a container writes a file that exists in a read-only layer, the storage driver copies it to the writable upper layer first (Copy-on-Write). The original layer is untouched.

### Image Content-Addressable Storage

Every layer is identified by the SHA256 hash of its content:

```
sha256:3b4d5f8a9c1e... = the alpine base layer
sha256:7f2a1c9b3d5e... = the node binaries layer
```

If two images include the exact same layer content, they share that layer on disk. `docker images` reports each image's "size" as if it stood alone, but `docker system df` shows the actual disk usage accounting for sharing.

### Useful Image Commands

```bash
docker images                          # list local images
docker images --filter dangling=true   # list untagged (dangling) images
docker pull node:20-alpine             # download image without running
docker inspect node:20-alpine          # full JSON metadata
docker history node:20-alpine          # show each layer, command, size
docker image prune                     # remove dangling images
docker image prune -a                  # remove ALL unused images
docker save myapp:v1 -o myapp.tar      # export image to tar file
docker load -i myapp.tar               # import image from tar
```

---

## 4. Containers — The Running Instance

A **container** is a running (or stopped) instance of an image. The relationship is like a class and an object: the image is the class definition, the container is the instantiated object.

### Container Lifecycle

```
                    docker create
Image ──────────────────────────────► Created
                                         │
                    docker start         │
                    docker run ──────────┤
                                         ▼
                                      Running ──────┐
                                         │          │ docker pause
                    docker stop          │          ▼
                    (SIGTERM + wait)      │       Paused
                    docker kill          │          │
                    (SIGKILL)            │          │ docker unpause
                                         │          │
                                         ▼          │
                                      Stopped ◄─────┘
                                         │
                    docker rm            │
                                         ▼
                                      (deleted)
```

### Container Identity

Every container gets:
- A **64-char hex ID**: `a3f8d2b9c1e4...`
- A **random name** if you don't provide one: `relaxed_einstein`, `hopeful_curie`
- Its own **hostname** (defaults to container ID short form)
- Its own **filesystem** (writable layer on top of image)
- Its own **network stack** (virtual network interface, IP address)
- Its own **process namespace** (PID 1 is whatever CMD runs)

### Key `docker run` Flags

```bash
docker run [OPTIONS] IMAGE [COMMAND] [ARGS...]

# Essential flags:
-d, --detach          # Run in background (daemon mode)
-it                   # Interactive terminal (combines -i and -t)
--name NAME           # Give the container a name
--rm                  # Delete container when it exits
-p HOST:CONTAINER     # Publish port HOST→CONTAINER
-v HOST:CONTAINER     # Mount volume HOST→CONTAINER
-e KEY=VALUE          # Set environment variable
--env-file FILE       # Load env vars from file
--network NAME        # Connect to Docker network
--restart POLICY      # Restart policy (no/always/unless-stopped/on-failure)
--memory 512m         # Limit RAM to 512MB
--cpus 1.5            # Limit to 1.5 CPU cores
--read-only           # Make root filesystem read-only
--user 1000:1000      # Run as specific user:group
--workdir /app        # Set working directory
```

### The Difference Between `CMD` and an Overriding Command

```bash
# Container runs whatever CMD is defined in the image
docker run node:20-alpine

# Container runs node --version INSTEAD of the image's CMD
docker run node:20-alpine node --version

# Container runs an interactive shell instead of CMD
docker run -it node:20-alpine sh
```

### Inspecting a Running Container

```bash
docker ps                     # list running containers
docker ps -a                  # list all containers (including stopped)
docker logs CONTAINER         # show stdout/stderr from container
docker logs -f CONTAINER      # follow (tail -f) log output
docker top CONTAINER          # show processes inside container
docker stats CONTAINER        # live CPU/RAM/network/disk stats
docker exec -it CONTAINER sh  # open shell IN a running container
docker inspect CONTAINER      # full JSON state (IP, mounts, env, etc.)
docker port CONTAINER         # show port mappings
docker diff CONTAINER         # show filesystem changes from image
```

### PID 1 and Signal Handling — Critical Concept

In a container, your application runs as PID 1. This is special because:

1. PID 1 is responsible for reaping zombie processes
2. `docker stop` sends **SIGTERM** to PID 1 and waits (default 10s) for it to exit gracefully, then sends **SIGKILL**
3. If you wrap your process in a shell (`CMD sh -c "node server.js"`), the shell becomes PID 1 and may not forward SIGTERM to node, causing forced kills

**Correct:** Use JSON exec form so your app is PID 1:
```dockerfile
CMD ["node", "server.js"]    # node is PID 1, receives SIGTERM directly
```

**Wrong:** Shell form routes signals through sh:
```dockerfile
CMD node server.js            # sh is PID 1, node may not get SIGTERM
```

---

## 5. The Dockerfile — Building Images

A **Dockerfile** is a plain-text script that defines how to build an image. Each line is an instruction. Docker executes them top-to-bottom to produce a layered image.

### Every Dockerfile Instruction Explained

---

#### `FROM` — The Starting Point

```dockerfile
FROM image:tag
FROM image:tag AS stage_name   # named stage for multi-stage builds
FROM scratch                   # empty image (for static binaries)
```

`FROM` sets the base image. Every instruction after it builds on top of this. A Dockerfile must begin with `FROM` (or `ARG` before `FROM`).

**Choose your base wisely:**

| Base | Size | Use Case |
|------|------|----------|
| `ubuntu:22.04` | ~77MB | Familiar, full GNU toolchain |
| `debian:bookworm-slim` | ~74MB | Debian without extras |
| `alpine:3.19` | ~7MB | Minimal, musl libc, most popular for small images |
| `node:20-alpine` | ~65MB | Node.js on Alpine |
| `distroless/nodejs` | ~55MB | No shell, no package manager, just runtime |
| `scratch` | 0 bytes | Truly empty, for Go/Rust static binaries |

---

#### `WORKDIR` — Set Working Directory

```dockerfile
WORKDIR /app
```

Creates the directory if it doesn't exist and sets it as the current directory for all subsequent `RUN`, `COPY`, `ADD`, `CMD`, and `ENTRYPOINT` instructions. Prefer over `RUN mkdir && cd`.

---

#### `COPY` — Copy Files Into the Image

```dockerfile
COPY src dest                 # copy file or directory
COPY package*.json ./         # glob pattern (copies package.json and package-lock.json)
COPY --chown=1000:1000 . .   # copy with specific owner
COPY --from=build /app/dist . # copy from another build stage
```

**`COPY` vs `ADD`:**
- `COPY` is explicit: copies local files only
- `ADD` is magic: also downloads URLs and auto-extracts tar files
- **Always prefer `COPY`** unless you specifically need `ADD`'s extra features

---

#### `RUN` — Execute Commands During Build

```dockerfile
# Shell form (runs via /bin/sh -c)
RUN npm install

# Exec form (no shell, exact command)
RUN ["npm", "install"]

# Multi-command in one layer (critical for keeping image small)
RUN apk add --no-cache python3 make g++ \
    && npm ci --only=production \
    && apk del python3 make g++
```

**Shell vs exec form:** Shell form goes through `/bin/sh -c` which handles `&&`, `|`, variables, etc. Exec form bypasses the shell entirely — useful when you don't have a shell in your image.

---

#### `ENV` — Set Environment Variables

```dockerfile
ENV NODE_ENV=production
ENV PORT=3000 DB_PATH=/app/data/db.sqlite
```

`ENV` variables are available in the running container AND during subsequent build steps. They persist in the image — inspect them with `docker inspect`.

---

#### `ARG` — Build-Time Variables

```dockerfile
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine

ARG BUILD_DATE
ARG GIT_COMMIT
LABEL org.opencontainers.image.created=${BUILD_DATE}
LABEL org.opencontainers.image.revision=${GIT_COMMIT}
```

`ARG` variables only exist during the build — they are NOT in the running container. Pass them with `docker build --build-arg NODE_VERSION=18`.

---

#### `EXPOSE` — Document a Port

```dockerfile
EXPOSE 3000
EXPOSE 3000/tcp
EXPOSE 53/udp
```

`EXPOSE` is **documentation only** — it does not publish the port. Publishing happens with `-p` in `docker run` or `ports:` in Compose. However, `--publish-all` (`-P`) flag uses `EXPOSE` values to know which ports to publish.

---

#### `CMD` — Default Command

```dockerfile
CMD ["node", "server.js"]        # exec form (preferred)
CMD node server.js               # shell form
CMD ["npm", "start"]
```

`CMD` sets what runs when the container starts. There can only be **one** `CMD`. It can be overridden by passing a command to `docker run`.

---

#### `ENTRYPOINT` — Fixed Command

```dockerfile
ENTRYPOINT ["node"]
CMD ["server.js"]
```

`ENTRYPOINT` sets a command that **cannot be overridden** with `docker run` arguments (only with `--entrypoint`). Arguments to `docker run` are appended to `ENTRYPOINT`. `CMD` serves as default arguments to `ENTRYPOINT`.

The classic pattern:
```dockerfile
ENTRYPOINT ["docker-entrypoint.sh"]  # setup script
CMD ["node", "server.js"]             # default arg to entrypoint
```

**`CMD` vs `ENTRYPOINT`:**
- If you want `docker run myimage arg` to REPLACE the whole command: use `CMD`
- If you want `docker run myimage arg` to APPEND to a fixed prefix: use `ENTRYPOINT`

---

#### `VOLUME` — Declare Mount Points

```dockerfile
VOLUME /app/data
VOLUME ["/app/data", "/app/logs"]
```

Declares that `/app/data` should be a mount point. If not mounted with `-v`, Docker auto-creates an anonymous volume. This ensures that data written here survives container restarts (but not container deletion unless it's a named volume).

---

#### `USER` — Set the Running User

```dockerfile
USER node                     # by name
USER 1001                     # by UID
USER 1001:1001                # UID:GID
```

By default, containers run as root (UID 0). Setting `USER` switches to a non-root user for all subsequent instructions and for the container's process. **Always use a non-root user in production.**

---

#### `HEALTHCHECK` — Container Health Status

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

HEALTHCHECK NONE   # disable health check from base image
```

Docker periodically runs the health check command inside the container. Exit code 0 = healthy, 1 = unhealthy. Orchestrators (like Compose or Kubernetes) use this to decide whether to restart the container or route traffic to it.

---

#### `LABEL` — Image Metadata

```dockerfile
LABEL maintainer="alice@example.com"
LABEL org.opencontainers.image.title="Neon Runner"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.description="Cyberpunk infinite runner"
```

Key-value metadata attached to the image. Queryable via `docker inspect` and useful for automation.

---

#### `.dockerignore` — Exclude Files from Build Context

When you run `docker build`, Docker sends your entire project directory to the daemon as the **build context**. Before sending, it filters using `.dockerignore`:

```
# .dockerignore
node_modules/       # don't send 200MB of node_modules to daemon
.env                # never send secrets
.git/               # git history not needed in image
data/*.db           # local database files
*.log               # log files
tests/              # test code not needed in production image
```

**Why this matters:** If you have a large `node_modules` or many files, a missing `.dockerignore` causes `docker build` to be slow even before it executes a single instruction — because it's copying gigabytes over the Unix socket.

---

### A Complete Annotated Dockerfile

```dockerfile
# ── Base image ──────────────────────────────────────────────────────────────
# Use a pinned version tag, never 'latest' in production.
# Alpine is used for small size. 'node:20' alone would be ~1GB.
FROM node:20-alpine

# ── Build metadata ──────────────────────────────────────────────────────────
LABEL org.opencontainers.image.title="My App"
LABEL org.opencontainers.image.version="1.0.0"

# ── Set working directory ───────────────────────────────────────────────────
# All subsequent instructions use /app as the CWD.
WORKDIR /app

# ── System dependencies ─────────────────────────────────────────────────────
# Keep in a single RUN to avoid extra layers.
# --no-cache prevents apk from caching the index, saving ~2MB.
RUN apk add --no-cache curl

# ── Install Node dependencies ────────────────────────────────────────────────
# COPY package files BEFORE source code. This layer is cached as long as
# package.json/package-lock.json don't change — saving minutes on rebuilds.
COPY package*.json ./

# npm ci: clean install using lockfile, no modifications, faster than npm install
RUN npm ci --only=production

# ── Copy application source ──────────────────────────────────────────────────
# This layer changes often (every code change). It's LAST, so the expensive
# 'npm ci' layer above stays cached.
COPY . .

# ── Runtime setup ────────────────────────────────────────────────────────────
RUN mkdir -p /app/data

# ── Security: run as non-root user ───────────────────────────────────────────
# node:alpine images include a 'node' user (UID 1000).
USER node

# ── Network ──────────────────────────────────────────────────────────────────
EXPOSE 3000

# ── Health check ─────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# ── Startup command ──────────────────────────────────────────────────────────
# Exec form: node is PID 1 and receives SIGTERM directly for graceful shutdown.
CMD ["node", "server.js"]
```

---

## 6. Layer Caching — The Performance System

Layer caching is the most important performance optimization in Docker. Understanding it turns 10-minute builds into 10-second builds.

### How the Cache Works

When Docker builds an image, before executing each instruction it checks: **Has this exact instruction been executed before on this exact parent layer?**

If yes: **reuse the cached layer**. Skip the work entirely.
If no: **execute the instruction**, create a new layer, and **invalidate all subsequent layers**.

### Cache Invalidation Rules

**`RUN` instructions:** Cache key = (previous layer SHA + instruction string)
```dockerfile
RUN npm ci --only=production   # cached if previous layer + this string match
```

**`COPY` / `ADD` instructions:** Cache key = (previous layer SHA + content hash of copied files)
```dockerfile
COPY package*.json ./   # invalidated if package.json or package-lock.json changes
COPY . .               # invalidated if ANY file in . changes
```

**`ENV`, `ARG`, `WORKDIR`, `LABEL`:** Cache key = (previous layer SHA + instruction string)

### The Critical Ordering Rule

**Put things that change rarely near the top. Put things that change often near the bottom.**

```dockerfile
# WRONG ORDER — code change invalidates npm ci cache
FROM node:20-alpine
WORKDIR /app
COPY . .                          # ← code changes → cache miss
RUN npm ci --only=production      # ← always re-runs! (500 packages, 2 min)

# CORRECT ORDER — npm ci cache survives code changes
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./             # ← rarely changes → usually cache hit
RUN npm ci --only=production      # ← skipped when only code changed!
COPY . .                          # ← code changes → only this and below re-run
```

With the correct order:
- Change `server.js` → only `COPY . .` re-runs (< 1 second)
- Change `package.json` → `COPY package*.json` + `npm ci` re-run (2 minutes once, then cached again)

### Visualizing Cache Behavior

```
Build 1 (first run — no cache):         Build 2 (only code changed):
─────────────────────────────────        ─────────────────────────────────
FROM node:20-alpine     [PULL]           FROM node:20-alpine     [CACHED]
WORKDIR /app            [CREATE]         WORKDIR /app            [CACHED]
RUN apk add curl        [EXECUTE 30s]    RUN apk add curl        [CACHED]
COPY package*.json      [COPY]           COPY package*.json      [CACHED]
RUN npm ci              [EXECUTE 90s]    RUN npm ci              [CACHED]
COPY . .                [COPY]           COPY . .                [COPY - changed]
RUN mkdir -p /app/data  [CREATE]         RUN mkdir -p /app/data  [EXECUTE 0.1s]
                                                                  ↑ only this
Total: ~2 min 30 sec                     Total: ~1 sec
```

### Force-Bypassing the Cache

```bash
docker build --no-cache -t myapp .   # ignore all cached layers
```

Useful when you need to pull the latest base image or refresh a `RUN apk update`.

---

## 7. Docker CLI — Every Command You Need

### Building Images

```bash
# Basic build
docker build -t myapp:v1 .

# Build with specific Dockerfile
docker build -f Dockerfile.prod -t myapp:prod .

# Build with build args
docker build --build-arg NODE_ENV=production -t myapp .

# Build with no cache
docker build --no-cache -t myapp .

# Tag after build
docker tag myapp:v1 myregistry.io/team/myapp:v1

# Push to registry
docker push myregistry.io/team/myapp:v1

# Pull specific image
docker pull node:20-alpine
```

### Running Containers

```bash
# Run and remove when done
docker run --rm node:20-alpine node --version

# Run in background
docker run -d --name webserver nginx

# Run interactive shell
docker run -it --rm ubuntu bash

# Run with port mapping (host:container)
docker run -d -p 3000:3000 myapp

# Run with multiple ports
docker run -d -p 80:8080 -p 443:8443 myapp

# Run with environment variables
docker run -e NODE_ENV=production -e PORT=3000 myapp

# Run with env file
docker run --env-file .env myapp

# Run with named volume
docker run -v mydata:/app/data myapp

# Run with bind mount (current dir → /app)
docker run -v $(pwd):/app -w /app node:20-alpine npm install

# Run with resource limits
docker run --memory=512m --cpus=1.0 myapp

# Run with restart policy
docker run -d --restart=unless-stopped myapp
```

### Managing Containers

```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# List just container IDs
docker ps -q

# Stop container (SIGTERM, then SIGKILL after 10s)
docker stop mycontainer

# Stop with custom timeout
docker stop --time=30 mycontainer

# Kill immediately
docker kill mycontainer

# Kill with specific signal
docker kill --signal=SIGHUP mycontainer

# Start stopped container
docker start mycontainer

# Restart
docker restart mycontainer

# Remove stopped container
docker rm mycontainer

# Remove running container (force)
docker rm -f mycontainer

# Remove all stopped containers
docker container prune

# Rename
docker rename old_name new_name
```

### Inspecting and Debugging

```bash
# Show logs
docker logs mycontainer

# Follow logs (like tail -f)
docker logs -f mycontainer

# Show last N lines
docker logs --tail 100 mycontainer

# Show logs with timestamps
docker logs -t mycontainer

# Run command in running container
docker exec mycontainer ls /app

# Open interactive shell in running container
docker exec -it mycontainer sh      # Alpine (no bash)
docker exec -it mycontainer bash    # Ubuntu/Debian

# Run as root even if USER is set
docker exec -it -u root mycontainer sh

# See resource usage
docker stats                        # all containers
docker stats mycontainer            # specific container

# Inspect full container state
docker inspect mycontainer

# Get specific field from inspect
docker inspect --format='{{.State.Status}}' mycontainer
docker inspect --format='{{.NetworkSettings.IPAddress}}' mycontainer

# See filesystem changes from image
docker diff mycontainer

# Copy file from container to host
docker cp mycontainer:/app/data/db.sqlite ./backup.sqlite

# Copy file to container
docker cp local.conf mycontainer:/etc/nginx/nginx.conf

# Show running processes
docker top mycontainer
```

### Managing Images

```bash
# List images
docker images
docker images --no-trunc          # show full IDs

# Remove image
docker rmi myapp:v1

# Remove multiple
docker rmi myapp:v1 myapp:v2

# Remove all dangling images
docker image prune

# Remove ALL unused images
docker image prune -a

# Show image history (layers)
docker history myapp:v1

# Full image metadata
docker inspect myapp:v1

# Save image to tar
docker save myapp:v1 | gzip > myapp-v1.tar.gz

# Load image from tar
docker load < myapp-v1.tar.gz
```

### System Maintenance

```bash
# Show disk usage
docker system df
docker system df -v               # verbose, per image/container/volume

# Remove everything unused
docker system prune

# Remove everything unused including images
docker system prune -a

# Remove everything including volumes (DANGEROUS)
docker system prune -a --volumes

# Show Docker version and info
docker version
docker info
```

---

## 8. Networking — How Containers Talk

### Network Drivers

Docker ships with several network drivers:

| Driver | Description | Use Case |
|--------|-------------|----------|
| **bridge** | Virtual switch on host, NAT to outside | Default for standalone containers |
| **host** | Container shares host network stack | Maximum performance, no isolation |
| **none** | No networking | Fully isolated, batch jobs |
| **overlay** | Spans multiple Docker hosts | Docker Swarm, distributed apps |
| **macvlan** | Container gets its own MAC/IP on LAN | Legacy apps needing direct LAN access |

### Bridge Networking (Default)

When you install Docker, it creates a virtual network bridge `docker0`:

```
Host machine
┌─────────────────────────────────────────────────┐
│  eth0 (host network) — 192.168.1.100            │
│                                                 │
│  docker0 (bridge) — 172.17.0.1/16              │
│  ┌─────────────┐  ┌─────────────┐              │
│  │  container1 │  │  container2 │              │
│  │  172.17.0.2 │  │  172.17.0.3 │              │
│  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────┘
```

- Containers on the same bridge can reach each other by IP
- The host can reach containers by their IPs
- Containers cannot reach the outside world directly — traffic goes through NAT

### Port Publishing

```bash
docker run -p 3000:3000 myapp
#              │      └── container port
#              └───────── host port
```

This creates an iptables NAT rule: traffic arriving on host port 3000 is forwarded to the container's port 3000.

```bash
# Publish on specific host interface (only localhost)
docker run -p 127.0.0.1:3000:3000 myapp

# Random host port → container port
docker run -p 3000 myapp          # Docker picks a free host port

# Publish all EXPOSE'd ports to random host ports
docker run -P myapp
```

### Custom Networks — Container DNS

The default `docker0` bridge has a significant limitation: containers can only address each other by IP, not by name.

When you create a **user-defined bridge network**, Docker automatically provides **DNS resolution** — containers can find each other by container name:

```bash
# Create network
docker network create mynetwork

# Run containers on that network
docker run -d --network mynetwork --name database postgres
docker run -d --network mynetwork --name app myapp

# Inside 'app' container, 'database' resolves via DNS:
# ping database → 172.20.0.2
# PGHOST=database works!
```

This is why Docker Compose works so smoothly — Compose creates a custom network for each project, and services find each other by service name.

### Network Commands

```bash
# List networks
docker network ls

# Create network
docker network create mynet
docker network create --driver bridge --subnet 10.0.0.0/24 mynet

# Inspect network
docker network inspect mynet

# Connect running container to network
docker network connect mynet mycontainer

# Disconnect
docker network disconnect mynet mycontainer

# Remove network
docker network rm mynet

# Remove all unused networks
docker network prune
```

---

## 9. Volumes and Storage — Persisting Data

Containers are ephemeral — when a container is removed, its writable layer is deleted. Any data written there is gone. Volumes solve this.

### Three Types of Mounts

```
┌─────────────────────────────────────────────────────────────┐
│                        Host Filesystem                      │
│                                                             │
│  /home/alice/data/       Docker managed volumes             │
│  ┌───────────────┐       /var/lib/docker/volumes/mydata/   │
│  │  Bind Mount   │       ┌──────────────────────────────┐  │
│  │  exact path   │       │      Named Volume            │  │
│  └───────────┬───┘       └──────────────┬───────────────┘  │
│              │                          │                   │
└──────────────┼──────────────────────────┼───────────────────┘
               │                          │
           ┌───▼──────────────────────────▼───┐
           │           Container              │
           │   /app/data ◄─ both mount here  │
           └──────────────────────────────────┘
                                    ▲
                               tmpfs mount
                               (RAM only, lost on restart)
```

### Named Volumes

Docker manages the storage location (`/var/lib/docker/volumes/`). You reference by name.

```bash
# Create named volume
docker volume create mydata

# Use in docker run
docker run -v mydata:/app/data myapp

# Use in Compose
volumes:
  mydata:

services:
  app:
    volumes:
      - mydata:/app/data

# Inspect volume
docker volume inspect mydata

# List volumes
docker volume ls

# Remove volume
docker volume rm mydata

# Remove all unused volumes
docker volume prune
```

**Best for:** Databases, application state, anything that needs to persist across container recreations and doesn't need direct host access.

### Bind Mounts

Mount a specific host path into the container. The container sees whatever is at that host path.

```bash
docker run -v /home/alice/project:/app myapp

# Shorthand with $(pwd):
docker run -v $(pwd):/app myapp

# Read-only bind mount
docker run -v $(pwd)/config:/app/config:ro myapp
```

**Best for:**
- Development (mount your source code → edit on host, see changes instantly in container)
- Configuration files you manage on the host
- Sharing data between host and container

**Not ideal for production:** tight coupling to host filesystem structure.

### tmpfs Mounts

Stored in RAM, never written to disk. Lost when container stops.

```bash
docker run --tmpfs /tmp myapp
docker run --tmpfs /tmp:rw,noexec,nosuid,size=100m myapp
```

**Best for:** Secrets, temporary files, sensitive scratch data.

### Volume Commands Deep Dive

```bash
# List all volumes
docker volume ls

# List dangling volumes (created by --volumes but not named)
docker volume ls -f dangling=true

# Inspect a volume (shows mountpoint on host)
docker volume inspect mydata
# Output includes: "Mountpoint": "/var/lib/docker/volumes/mydata/_data"

# Backup a volume
docker run --rm \
  -v mydata:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/mydata.tar.gz -C /data .

# Restore a volume
docker run --rm \
  -v mydata:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/mydata.tar.gz -C /data

# Remove volume
docker volume rm mydata

# Remove all unused volumes
docker volume prune
```

---

## 10. Docker Compose — Multi-Container Apps

Docker Compose is a tool for defining and running multi-container applications. You describe your entire application stack in a single `docker-compose.yml` file and manage it with one command.

### Why Compose Exists

Real applications aren't single containers. A typical web app has:
- Application server
- Database
- Cache (Redis)
- Background worker
- Reverse proxy (Nginx)

Managing these individually — creating networks, volumes, passing environment variables, starting in the right order — is tedious and error-prone. Compose automates all of it.

### The docker-compose.yml Structure

```yaml
version: '3.8'            # Compose file format version

services:                  # Define each container
  app:                     # Service name (becomes DNS hostname)
    build: .               # Build from Dockerfile in current dir
    image: myapp:v1        # Or use a pre-built image
    container_name: myapp  # Custom container name
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DB_HOST: database    # 'database' resolves via Compose DNS
    env_file:
      - .env
    volumes:
      - ./data:/app/data   # Bind mount
      - logs:/app/logs     # Named volume
    networks:
      - backend
    depends_on:
      database:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

  database:
    image: postgres:16
    environment:
      POSTGRES_DB: mydb
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser"]
      interval: 10s
      timeout: 5s
      retries: 5

  cache:
    image: redis:7-alpine
    networks:
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - certs:/etc/nginx/certs:ro
    networks:
      - backend
    depends_on:
      - app

volumes:                   # Named volumes (managed by Docker)
  pgdata:
  logs:
  certs:

networks:                  # Custom networks
  backend:
    driver: bridge
```

### All `docker compose` Commands

```bash
# Start all services (build if needed)
docker compose up

# Start in background
docker compose up -d

# Force rebuild before starting
docker compose up --build

# Start specific services only
docker compose up app database

# Stop all services (SIGTERM)
docker compose stop

# Stop and remove containers, networks
docker compose down

# Stop, remove containers, networks AND named volumes
docker compose down -v

# Stop, remove containers, networks, volumes AND images
docker compose down -v --rmi all

# Build (or rebuild) images
docker compose build

# Pull latest images
docker compose pull

# Show logs
docker compose logs
docker compose logs -f app          # follow specific service
docker compose logs --tail=50 app

# List running services
docker compose ps

# Run a one-off command in a service
docker compose run --rm app node --version
docker compose run --rm app sh      # interactive shell

# Execute command in running service
docker compose exec app sh
docker compose exec -u root app sh

# Scale a service (run N instances)
docker compose up --scale app=3

# Show resource usage
docker compose top

# Show port mappings
docker compose port app 3000

# Validate compose file
docker compose config
```

### Environment Variable Handling in Compose

Compose has several ways to handle environment variables, in order of precedence:

```bash
# 1. Shell environment (highest priority)
export NODE_ENV=staging
docker compose up

# 2. --env-file flag
docker compose --env-file .env.staging up

# 3. .env file in project directory (automatic)
# .env
NODE_ENV=development
DB_PASSWORD=devpassword

# 4. environment: in compose file
environment:
  NODE_ENV: production

# 5. env_file: in compose file
env_file:
  - .env
  - .env.local
```

In `docker-compose.yml`, you can interpolate shell or `.env` variables:

```yaml
services:
  app:
    image: ${IMAGE_NAME:-myapp}:${IMAGE_TAG:-latest}
    environment:
      DB_PASSWORD: ${DB_PASSWORD}   # required, error if missing
      LOG_LEVEL: ${LOG_LEVEL:-info} # optional with default
```

### `depends_on` and Startup Order

```yaml
services:
  app:
    depends_on:
      database:
        condition: service_started    # just needs to be started
      cache:
        condition: service_healthy    # needs to pass health check
```

**Important:** `depends_on: service_started` only waits for Docker to START the container — not for the app inside to be ready. Use `service_healthy` with a real health check for proper startup ordering.

For databases that take a few seconds to accept connections, always use `service_healthy`.

### Compose Profiles

Profiles let you optionally include services:

```yaml
services:
  app:
    image: myapp
  
  debug-tools:
    image: alpine
    profiles: ["debug"]   # only starts with --profile debug

  admin:
    image: pgadmin
    profiles: ["admin"]
```

```bash
docker compose up                        # starts app only
docker compose --profile debug up        # starts app + debug-tools
docker compose --profile admin up        # starts app + admin
```

---

## 11. Security — Running Docker Safely

### Never Run as Root

By default, containers run as root (UID 0). This means a container escape gives the attacker root on the host.

```dockerfile
# Option 1: Use built-in user (node image provides 'node' user)
USER node

# Option 2: Create a dedicated user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Option 3: Use a UID directly (no /etc/passwd needed)
USER 1001
```

In Compose:
```yaml
services:
  app:
    user: "1001:1001"
```

### Read-Only Root Filesystem

Prevent the container from writing to its own filesystem (except designated writable volumes):

```bash
docker run --read-only \
  --tmpfs /tmp \
  -v mydata:/app/data \
  myapp
```

In Compose:
```yaml
services:
  app:
    read_only: true
    tmpfs:
      - /tmp
    volumes:
      - mydata:/app/data
```

### Drop Capabilities

Linux capabilities are fine-grained privileges. Drop all and add back only what's needed:

```bash
docker run --cap-drop ALL --cap-add NET_BIND_SERVICE myapp
```

In Compose:
```yaml
services:
  app:
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE    # only if binding ports < 1024
```

### No New Privileges

Prevent escalation via setuid binaries:

```bash
docker run --security-opt no-new-privileges myapp
```

### Secrets Management

Never put secrets in `ENV`, `ARG`, or baked into images — they appear in `docker inspect` and image metadata.

```bash
# Docker secrets (Swarm mode)
echo "mysecretpassword" | docker secret create db_password -

# In compose (Swarm)
services:
  app:
    secrets:
      - db_password

secrets:
  db_password:
    external: true
```

For standalone (non-Swarm), use a `.env` file (not committed to git) + `env_file:`:

```yaml
services:
  app:
    env_file:
      - .env.secret    # in .gitignore, contains actual secrets
```

Or mount secrets as files:
```yaml
volumes:
  - ./secrets/db_password.txt:/run/secrets/db_password:ro
```
Then read in app: `fs.readFileSync('/run/secrets/db_password', 'utf-8').trim()`

### Resource Limits

Without limits, a single container can starve all others:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
        reservations:
          memory: 128M
          cpus: '0.25'
```

Or in `docker run`:
```bash
docker run --memory=512m --memory-swap=512m --cpus=1.0 myapp
#          ─────────────  ───────────────────  ─────────
#           RAM limit      RAM + swap limit     CPU limit
```

### Image Scanning

Before deploying, scan images for known CVEs:

```bash
# Docker Scout (built into Docker Desktop/CLI)
docker scout cves myapp:v1
docker scout recommendations myapp:v1

# Trivy (open source, comprehensive)
trivy image myapp:v1

# Grype (anchore)
grype myapp:v1
```

---

## 12. Multi-Stage Builds — Shrinking Images

Multi-stage builds let you use multiple `FROM` instructions in one Dockerfile. Each `FROM` starts a new build stage. You can copy artifacts between stages, discarding everything else.

**The problem:** Build tools (compilers, test runners, bundlers) are not needed at runtime. Including them bloats the image and increases attack surface.

### Example: Node.js with Build Step

```dockerfile
# ── Stage 1: Builder ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install ALL dependencies (including dev)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build       # produces dist/
RUN npm test            # run tests during build (fail build if tests fail)

# ── Stage 2: Production ────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy ONLY the built output from builder stage
# Everything else (node_modules dev deps, src, test files) is NOT included
COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

Result: The production image contains only the runtime and compiled output — not TypeScript compiler, test frameworks, or source maps.

### Example: Go Binary (Extreme Shrinkage)

```dockerfile
# ── Stage 1: Build binary ─────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server .

# ── Stage 2: Minimal runtime ──────────────────────────────────────────────
FROM scratch    # ← completely empty image

COPY --from=builder /app/server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

EXPOSE 8080
CMD ["/server"]
```

**Result:** ~8MB image (vs ~800MB with the Go builder toolchain).

### Targeting a Specific Stage

```bash
# Build only to the 'builder' stage (useful for extracting test results)
docker build --target builder -t myapp:test .

# Build only the production stage
docker build --target production -t myapp:prod .
```

### Size Comparison

For a typical Node.js app:

| Approach | Image Size |
|----------|-----------|
| `node:20` (full) + all deps | ~1.2 GB |
| `node:20-alpine` + all deps | ~250 MB |
| `node:20-alpine` + prod deps only | ~180 MB |
| Multi-stage: prod image | ~110 MB |
| Multi-stage: distroless | ~75 MB |

---

## 13. Health Checks, Logging, and Debugging

### Health Check Deep Dive

```dockerfile
HEALTHCHECK [OPTIONS] CMD command

# Options:
# --interval=DURATION   (default: 30s) — time between checks
# --timeout=DURATION    (default: 30s) — time before check is considered failed
# --start-period=DURATION (default: 0s) — grace period before checks count
# --retries=N           (default: 3) — consecutive failures before unhealthy
```

Health states: `starting` → `healthy` or `unhealthy`

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' mycontainer

# See health check log
docker inspect --format='{{json .State.Health}}' mycontainer | python3 -m json.tool
```

In Compose, `depends_on: condition: service_healthy` waits for a service to reach `healthy` state before starting dependents.

### Logging Drivers

Docker captures everything written to stdout/stderr. The logging driver controls where those bytes go.

```bash
# View logs with docker logs (works with json-file and local drivers)
docker logs mycontainer

# Configure logging driver
docker run --log-driver=json-file \
           --log-opt max-size=10m \
           --log-opt max-file=3 \
           myapp
```

Common drivers:

| Driver | Description |
|--------|-------------|
| `json-file` | Default. Writes JSON to `/var/lib/docker/containers/<id>/<id>-json.log` |
| `local` | More efficient local storage, binary format |
| `syslog` | Sends to system syslog |
| `journald` | Sends to systemd journal |
| `fluentd` | Sends to Fluentd aggregator |
| `awslogs` | Sends to AWS CloudWatch |
| `splunk` | Sends to Splunk |
| `none` | Discards all logs |

Configure in Compose:
```yaml
services:
  app:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

**Application logging best practice:** Log to **stdout/stderr** only. Never log to files inside the container. Docker/orchestrators capture stdout/stderr and route them wherever configured.

### Debugging Techniques

**1. Shell into a running container:**
```bash
docker exec -it mycontainer sh
# or bash if available
docker exec -it mycontainer bash
```

**2. Shell into a dead/crashed container:**
```bash
# Commit the stopped container to a new image
docker commit stopped_container debug_image

# Run debug_image with a shell
docker run -it --entrypoint sh debug_image
```

**3. Override entrypoint to get a shell:**
```bash
docker run -it --entrypoint sh myapp
```

**4. Check environment variables:**
```bash
docker exec mycontainer env
```

**5. Inspect files in container:**
```bash
docker exec mycontainer ls -la /app
docker exec mycontainer cat /app/server.js
```

**6. Copy files out:**
```bash
docker cp mycontainer:/app/logs/error.log ./error.log
```

**7. Attach to running process (see stdout/stderr live):**
```bash
docker attach mycontainer
# Detach without stopping: Ctrl+P then Ctrl+Q
```

**8. Run an ephemeral diagnostic container on the same network:**
```bash
docker run --rm --network mynet \
  curlimages/curl curl http://app:3000/health
```

---

## 14. Production Patterns and Best Practices

### 1. Pin Image Tags

```dockerfile
# Bad: changes silently
FROM node:latest
FROM node:20

# Good: deterministic
FROM node:20.18.1-alpine3.20

# Also good: specific Alpine version
FROM node:20-alpine3.20
```

### 2. Use `.dockerignore`

Always have a `.dockerignore`. At minimum:
```
node_modules
.git
.env
*.log
dist
coverage
.nyc_output
.DS_Store
```

### 3. One Process Per Container

Don't run nginx + node + postgres in one container. Run one process per container and use Compose or orchestration to wire them together. This enables:
- Independent scaling
- Independent restart on failure
- Independent logging
- Independent resource limits

### 4. Graceful Shutdown

Your app should handle SIGTERM:
```javascript
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    db.close();
    process.exit(0);
  });
  // Force exit after 10s if graceful shutdown fails
  setTimeout(() => process.exit(1), 10000);
});
```

And your Dockerfile should use exec form (so your app is PID 1):
```dockerfile
CMD ["node", "server.js"]   # not: CMD node server.js
```

### 5. Don't Run as Root

Every production container should have `USER nonroot` (or equivalent) in the Dockerfile.

### 6. Minimize Image Layers

```dockerfile
# Bad: 3 separate layers for apk operations
RUN apk update
RUN apk add curl
RUN apk add python3

# Good: 1 layer, clean cache, smaller image
RUN apk add --no-cache curl python3
```

### 7. Use `npm ci` Not `npm install`

```dockerfile
# In Dockerfile, always use npm ci:
# - Uses package-lock.json exactly (reproducible builds)
# - Deletes node_modules first (clean state)
# - Never modifies package.json or lockfile
RUN npm ci --only=production
```

### 8. Tag Images Semantically

```bash
docker build -t myapp:1.2.3 -t myapp:1.2 -t myapp:1 -t myapp:latest .
```

Tag with:
- Full semver: `1.2.3`
- Minor: `1.2`
- Major: `1`
- Git SHA: `sha-a3f8d2b`
- `latest` (for convenience, never rely on it)

### 9. Health Checks in Production

Every production service should have a health check. Use it to:
- Delay traffic routing until truly ready
- Auto-restart unhealthy containers
- Alert operations to service degradation

### 10. Use Restart Policies

```yaml
restart: unless-stopped   # restart on crash, stop on docker stop
restart: on-failure:5     # restart up to 5 times, then give up
restart: always           # always restart (even docker stop + docker start)
restart: no               # never restart (default)
```

---

## 15. Neon Runner: Complete Docker Deep Dive

Now let's apply everything above to the actual Docker configuration in this project.

### The Dockerfile — Line by Line

```
Dockerfile
```

```dockerfile
FROM node:20-alpine
```

**Why node:20-alpine?**
- `node:20` — Node.js LTS (Long Term Support) version. Stable, supported until April 2026.
- `-alpine` — Based on Alpine Linux 3.x, ~7MB base OS vs ~77MB for Debian-based. Much smaller final image.
- **Trade-off:** Alpine uses `musl libc` instead of `glibc`. Most npm packages work fine, but native addons compiled for glibc may fail on Alpine. `better-sqlite3` is a native addon, which is why we need build tools.

**Improvement for production:** Pin to exact version:
```dockerfile
FROM node:20.18.1-alpine3.20
```

---

```dockerfile
WORKDIR /app
```

Creates `/app` directory (if it doesn't exist) and sets it as the CWD. All subsequent `COPY`, `RUN`, and `CMD` instructions resolve paths relative to `/app`.

---

```dockerfile
# Install build tools needed for better-sqlite3 native module and curl for healthcheck
RUN apk add --no-cache python3 make g++ curl
```

**Why these packages?**
- `python3` — Required by `node-gyp`, which compiles native Node.js addons
- `make` — Required by `node-gyp` build system
- `g++` — C++ compiler required to compile `better-sqlite3`'s SQLite C++ bindings
- `curl` — Used by the `HEALTHCHECK` command to hit the `/api/stats` endpoint

**Why `--no-cache`?**
Alpine's package manager stores an index file to speed up installs. `--no-cache` skips storing it, saving ~2MB in the image layer. Since the image is built once and then frozen, the cache would never be used anyway.

**Layer insight:** This creates one layer. If split into multiple `RUN apk add` commands, each would create a separate layer — larger image.

---

```dockerfile
COPY package*.json ./
```

Copies `package.json` AND `package-lock.json` (the glob `package*.json` matches both). The destination `./` means `/app/` (because of `WORKDIR`).

**Why copy BEFORE the rest of the code?**
This is the critical layer-caching optimization. `package.json` and `package-lock.json` only change when you add/remove/update dependencies — which happens rarely compared to editing application code.

By copying only these files first, then running `npm ci`, Docker caches the expensive `npm ci` step. On the next build, if only `server.js` changed:
1. `FROM node:20-alpine` → **cache hit**
2. `WORKDIR /app` → **cache hit**
3. `RUN apk add...` → **cache hit**
4. `COPY package*.json ./` → **cache hit** (files unchanged)
5. `RUN npm ci` → **CACHE HIT** (saves 60-120 seconds!)
6. `COPY . .` → **cache miss** (code changed)
7. `RUN mkdir -p /app/data` → re-run (sub-second)

---

```dockerfile
RUN npm ci --only=production
```

`npm ci`:
- Reads `package-lock.json` exactly (deterministic, reproducible)
- Deletes `node_modules` first (clean state, no leftover packages)
- Fails if `package-lock.json` is out of sync with `package.json`
- Faster than `npm install` in CI/CD contexts

`--only=production`:
- Skips `devDependencies` (jest, nodemon, supertest, etc.)
- In our case, saves ~40MB of test tooling from the image
- Packages like `nodemon` are completely useless in a Docker container

---

```dockerfile
COPY . .
```

Copies everything from the build context (project directory) to `/app`. The build context is filtered by `.dockerignore`.

What gets excluded by `.dockerignore`:
```
node_modules    ← already installed in the image
.env            ← never bake secrets into images
data/*.db       ← local database, use volume in production
.git            ← git history not needed at runtime
tests           ← test code not needed in production
*.md            ← documentation not needed at runtime
```

What gets included:
- `server.js`
- `database/`, `models/`, `routes/`, `middleware/`
- `public/` (HTML, CSS, JS frontend)

---

```dockerfile
RUN mkdir -p /app/data
```

Creates the directory where SQLite writes the database file. The `-p` flag creates intermediate directories and doesn't fail if it already exists.

**Without this:** When Docker mounts the `./data` volume at runtime, if `/app/data` doesn't exist, Docker creates it — but owned by root. Since our app runs as node (if we add `USER node`), it would fail to write. Pre-creating it in the Dockerfile at the correct ownership is safer.

**Improvement:**
```dockerfile
RUN mkdir -p /app/data && chown node:node /app/data
USER node
```

---

```dockerfile
EXPOSE 3000
```

Documents that the container listens on port 3000. This doesn't publish the port — it's metadata. Publishing happens in `docker-compose.yml` with `ports: "3000:3000"`.

---

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/stats || exit 1
```

**Breaking down the options:**
- `--interval=30s` — Check every 30 seconds
- `--timeout=10s` — The curl must complete within 10 seconds, or it's a failure
- `--start-period=15s` — Don't count failures during the first 15 seconds (gives the app time to start)
- `--retries=3` — Must fail 3 consecutive times to become `unhealthy`

**The command:**
- `curl -f` — The `-f` flag makes curl exit with error code 22 if HTTP status is 400+
- `http://localhost:3000/api/stats` — Our stats endpoint always returns 200 if the server is running
- `|| exit 1` — Explicit failure exit code

**Health state machine:**
```
Container starts
      │
      ▼
  [starting]   ← 15s start-period, failures don't count
      │
   15s passes
      │
      ▼
  [check runs every 30s]
      │
  ┌── success ──────────────────► [healthy]
  └── 3 consecutive failures ──► [unhealthy]
```

When `unhealthy`, Compose restarts the container (if `restart: unless-stopped`).

---

```dockerfile
CMD ["node", "server.js"]
```

**JSON (exec) form** — runs `node` directly without a shell. `node` becomes PID 1 and receives OS signals directly.

When `docker stop` is issued:
1. Docker sends SIGTERM to PID 1 (node)
2. Node's `process.on('SIGTERM', ...)` handler runs
3. Server closes existing connections
4. Node exits with code 0
5. Container stops cleanly

**If we used shell form** (`CMD node server.js`):
1. Docker sends SIGTERM to `/bin/sh` (PID 1)
2. `/bin/sh` may or may not forward to node (behavior varies)
3. After 10s, Docker sends SIGKILL to the process group
4. Node is force-killed without graceful shutdown

---

### The docker-compose.yml — Line by Line

```
docker-compose.yml
```

```yaml
version: '3.8'
```

The Compose file format version. `3.8` supports all modern features including resource limits, healthcheck conditions, and deploy configs. This must be compatible with your Docker Engine version.

---

```yaml
services:
  neon-runner:
```

Defines one service named `neon-runner`. This name becomes:
- The container name prefix (if no `container_name` is set): `dinogame-neon-runner-1`
- The DNS hostname on the Compose network: other services can reach this service at `neon-runner`

---

```yaml
    build: .
```

Tells Compose to build the image from the `Dockerfile` in the current directory (`.`). The full form with more control:

```yaml
    build:
      context: .
      dockerfile: Dockerfile
      args:
        NODE_ENV: production
      cache_from:
        - myapp:latest
```

---

```yaml
    container_name: neon-runner
```

Gives the container a fixed name instead of the auto-generated `projectname_service_1` format. Useful for:
- Predictable container names in scripts
- `docker logs neon-runner` without looking up the auto-name

**Trade-off:** With a fixed container_name, you can only run one instance (no `--scale` support).

---

```yaml
    restart: unless-stopped
```

Restart policy options:
- `no` — Never restart (default)
- `always` — Always restart, even after `docker stop` + `docker start`
- `on-failure` — Restart on non-zero exit code
- `on-failure:5` — Restart up to 5 times, then give up
- `unless-stopped` — **Most practical for production:** restart on crash, but respect manual `docker stop`

---

```yaml
    ports:
      - "3000:3000"
```

Publishes container port 3000 to host port 3000. Format: `"HOST:CONTAINER"`.

With this, `curl http://localhost:3000` on the host reaches the container.

**For local dev only (security hardening):**
```yaml
ports:
  - "127.0.0.1:3000:3000"   # only accessible from localhost, not LAN
```

---

```yaml
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_PATH=/app/data/neon-runner.db
```

Sets environment variables in the running container. The app reads:
- `NODE_ENV=production` — affects Express middleware behavior, error messaging
- `PORT=3000` — which port the server listens on
- `DB_PATH=/app/data/neon-runner.db` — SQLite database path (inside container)

**Note:** `DB_PATH` uses `/app/data/` (inside the container), which maps to `./data/` on the host via the volume below.

---

```yaml
    volumes:
      - ./data:/app/data
```

Bind mount: the host's `./data/` directory is mounted at `/app/data` in the container.

**What this means for the database:**
1. Container writes to `/app/data/neon-runner.db`
2. Because of the bind mount, this is actually writing to `./data/neon-runner.db` on the host
3. If the container is stopped and restarted, the database is still there on the host
4. You can backup the database by copying `./data/neon-runner.db` on the host

**Without this volume:** The database would live inside the container's writable layer and be destroyed with `docker compose down`.

---

```yaml
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/stats"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
```

This overrides the Dockerfile's `HEALTHCHECK` (or adds one if the Dockerfile doesn't have it). The effect is identical — Compose just mirrors the Docker healthcheck syntax.

The `CMD` form runs the command directly (exec form). `CMD-SHELL` runs via `/bin/sh -c`:
```yaml
test: ["CMD-SHELL", "curl -f http://localhost:3000/api/stats || exit 1"]
```

---

### Building and Running with Docker

```bash
# Navigate to project
cd neon-runner

# Start with Compose (builds image first)
docker compose up -d

# Check it's running
docker compose ps

# View logs
docker compose logs -f

# Check health
docker inspect neon-runner --format='{{.State.Health.Status}}'

# Test the API
curl http://localhost:3000/api/stats
curl http://localhost:3000/api/leaderboard

# Test the game
# Open http://localhost:3000 in your browser

# Stop
docker compose stop

# Stop and remove containers (data persists in ./data/)
docker compose down

# Stop and remove containers AND data
docker compose down -v   # WARNING: deletes the database volume
```

### What the Build Produces

```bash
docker compose build
docker images | grep neon-runner

# Output (approximate):
# neon-runner-neon-runner   latest   abc123def456   2 min ago   182MB
```

**Layer breakdown of the built image:**

```
Layer 1: node:20-alpine base            ~65 MB (shared with all alpine+node images)
Layer 2: WORKDIR /app                    ~0 MB (metadata)
Layer 3: RUN apk add python3 make g++ curl  ~18 MB
Layer 4: COPY package*.json             ~0.1 MB
Layer 5: RUN npm ci --only=production   ~58 MB (express, helmet, better-sqlite3, etc.)
Layer 6: COPY . .                       ~0.5 MB (our source code)
Layer 7: RUN mkdir -p /app/data          ~0 MB
─────────────────────────────────────────────────
Total uncompressed: ~142 MB
Total compressed (in registry): ~75 MB
```

### Suggested Improvements for Production

#### 1. Add Non-Root User

```dockerfile
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Create data dir before switching user, set ownership
RUN mkdir -p /app/data && chown -R node:node /app/data

# Switch to non-root user
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/stats || exit 1

CMD ["node", "server.js"]
```

#### 2. Use Multi-Stage Build (Remove Build Tools from Final Image)

```dockerfile
# ── Stage 1: Install with build tools ──────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: Production image (no build tools) ────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Only curl needed for healthcheck (much smaller than full build toolchain)
RUN apk add --no-cache curl

# Copy only the installed node_modules from builder
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

RUN mkdir -p /app/data && chown -R node:node /app/data

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/stats || exit 1

CMD ["node", "server.js"]
```

This removes `python3`, `make`, and `g++` from the final image, reducing size by ~18MB and removing three attack-surface packages.

#### 3. Use Named Volume Instead of Bind Mount for Production

```yaml
version: '3.8'

services:
  neon-runner:
    build: .
    container_name: neon-runner
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_PATH=/app/data/neon-runner.db
    volumes:
      - neon-runner-data:/app/data   # Named volume for production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/stats"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

volumes:
  neon-runner-data:
    driver: local
```

Named volumes are managed by Docker and have better cross-platform behavior than bind mounts.

#### 4. Pin the Image Tag

```dockerfile
FROM node:20.18.1-alpine3.20
```

Locks to a specific Node + Alpine version combination. Ensures your build is identical in 6 months.

#### 5. Add Graceful Shutdown to server.js

```javascript
const server = app.listen(PORT, () => {
  console.log(`Neon Runner server running on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully');
  server.close(() => {
    db.close();
    console.log('Server closed');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Graceful shutdown timeout — forcing exit');
    process.exit(1);
  }, 10000);
});
```

#### 6. Add a Reverse Proxy for Production

For serving HTTPS and multiple services:

```yaml
version: '3.8'

services:
  neon-runner:
    build: .
    container_name: neon-runner
    restart: unless-stopped
    # No ports: exposed — only accessible via nginx
    networks:
      - internal
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - neon-runner-data:/app/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/stats"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    depends_on:
      neon-runner:
        condition: service_healthy

  nginx:
    image: nginx:1.25-alpine
    container_name: nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./certs:/etc/nginx/certs:ro
    networks:
      - internal
    depends_on:
      - neon-runner

volumes:
  neon-runner-data:

networks:
  internal:
    driver: bridge
```

---

### Running Tests Inside Docker

```bash
# Run tests in a throwaway container using the same image
docker compose run --rm neon-runner npm test

# Or build a test-specific image
docker build --target deps -t neon-runner:test .
docker run --rm neon-runner:test npm test
```

### Checking Image Size and Layers

```bash
cd neon-runner

# Build the image
docker compose build

# Check image size
docker images neon-runner-neon-runner

# Inspect layers (size per layer)
docker history neon-runner-neon-runner

# Full disk usage
docker system df -v
```

### Complete Workflow — Development to Production

```bash
# ── Development ──────────────────────────────────────────────────────────────
# Run directly (no Docker)
npm start

# ── Integration Testing ───────────────────────────────────────────────────────
# Run in Docker to verify it works containerized
docker compose up --build -d
curl http://localhost:3000/api/stats   # verify
docker compose down

# ── Production Deploy ─────────────────────────────────────────────────────────
# On the server:
git pull
docker compose pull          # pull pre-built images if using registry
docker compose up --build -d # OR build on server
docker compose ps            # verify running
docker compose logs -f       # monitor startup logs

# ── Backup Database ───────────────────────────────────────────────────────────
docker compose exec neon-runner \
  sqlite3 /app/data/neon-runner.db ".backup /app/data/backup.db"
cp ./data/backup.db ./backups/neon-runner-$(date +%Y%m%d).db

# ── Update Application ────────────────────────────────────────────────────────
git pull
docker compose up --build -d     # zero-downtime if behind a proxy
# Docker starts new container → health check passes → old container removed
```

---

## Quick Reference Card

```
Image operations:
  docker build -t name:tag .         Build image from Dockerfile
  docker pull image:tag              Download image from registry
  docker push image:tag              Upload image to registry
  docker images                      List local images
  docker rmi image:tag               Delete image
  docker history image               Show image layers

Container lifecycle:
  docker run [opts] image [cmd]      Create and start container
  docker start container             Start stopped container
  docker stop container              Stop container (SIGTERM)
  docker rm container                Delete stopped container
  docker rm -f container             Delete running container

Inspection:
  docker ps                          List running containers
  docker ps -a                       List all containers
  docker logs container              Show logs
  docker logs -f container           Follow logs
  docker exec -it container sh       Shell into container
  docker inspect container           Full JSON state
  docker stats                       Live resource usage

Compose:
  docker compose up -d               Start all services (background)
  docker compose down                Stop and remove all
  docker compose logs -f             Follow all service logs
  docker compose exec svc sh         Shell into running service
  docker compose ps                  List services and status
  docker compose build               Build/rebuild images

Cleanup:
  docker system prune                Remove unused everything
  docker system prune -a             Remove all unused images too
  docker volume prune                Remove unused volumes
```

---

*End of Docker Handbook — happy containerizing.*
