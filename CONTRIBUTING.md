# Contributing to Vibe Coding App

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

## Code of Conduct

Please be respectful and constructive in all interactions. We are committed to providing a welcoming and inclusive environment for everyone.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/vibe-coding-app.git
   cd vibe-coding-app
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/vibe-coding-app.git
   ```

## Development Setup

### Prerequisites

- Node.js >= 22.14.0
- pnpm >= 9.6.0
- PostgreSQL database (or use Vercel Postgres)

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Useful Commands

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `pnpm dev`        | Start all apps in development mode |
| `pnpm dev:next`   | Start only Next.js admin app       |
| `pnpm build`      | Build all packages and apps        |
| `pnpm lint`       | Run ESLint on all packages         |
| `pnpm lint:fix`   | Fix ESLint issues automatically    |
| `pnpm typecheck`  | Run TypeScript type checking       |
| `pnpm format`     | Check code formatting              |
| `pnpm format:fix` | Fix code formatting                |
| `pnpm db:studio`  | Open Drizzle Studio                |

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages. This enables automatic changelog generation and semantic versioning.

### Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | A new feature                                           |
| `fix`      | A bug fix                                               |
| `docs`     | Documentation only changes                              |
| `style`    | Changes that don't affect code meaning (formatting)     |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | A code change that improves performance                 |
| `test`     | Adding missing tests or correcting existing tests       |
| `build`    | Changes to build system or external dependencies        |
| `ci`       | Changes to CI configuration files and scripts           |
| `chore`    | Other changes that don't modify src or test files       |
| `revert`   | Reverts a previous commit                               |

### Scopes

Use the package/app name as scope when the change is specific to one:

- `admin` - Next.js admin app
- `mobile` - React Native mobile app
- `api` - tRPC API package
- `agents` - AI agents package
- `auth` - Authentication package
- `db` - Database package
- `e2b` - E2B sandbox package
- `jobs` - Background jobs package
- `ui` - Shared UI components
- `validators` - Zod validators
- `deps` - Dependency updates
- `config` - Configuration changes

### Examples

```bash
# Feature
feat(agents): add streaming response support

# Bug fix
fix(mobile): resolve navigation crash on iOS

# Documentation
docs: update README with new setup instructions

# Breaking change
feat(api)!: change message response format

BREAKING CHANGE: The message response now includes metadata field
```

## Pull Request Process

1. **Create a feature branch** from `main`:

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Commit your changes** using conventional commits:

   ```bash
   git commit -m "feat(scope): description of changes"
   ```

4. **Push to your fork**:

   ```bash
   git push origin feat/your-feature-name
   ```

5. **Open a Pull Request** against the `main` branch

6. **Fill out the PR template** completely

7. **Wait for review** and address any feedback

### PR Requirements

- [ ] All CI checks pass
- [ ] Code follows project conventions
- [ ] Tests added/updated as needed
- [ ] Documentation updated if needed
- [ ] No merge conflicts with `main`

## Project Structure

```
vibe-coding-app/
├── apps/
│   ├── admin/          # Next.js 15 admin dashboard
│   └── mobile/         # Expo React Native app
├── packages/
│   ├── api/            # tRPC API definitions
│   ├── agents/         # AI agent orchestration
│   ├── auth/           # Authentication utilities
│   ├── db/             # Database schema & client
│   ├── e2b/            # E2B sandbox integration
│   ├── jobs/           # Inngest background jobs
│   ├── ui/             # Shared UI components
│   └── validators/     # Zod validation schemas
├── tooling/
│   ├── eslint/         # ESLint configuration
│   ├── prettier/       # Prettier configuration
│   └── typescript/     # TypeScript configuration
└── sandbox-templates/  # E2B sandbox templates
```

### Package Guidelines

- Each package should have a clear, single responsibility
- Use `workspace:*` for internal dependencies
- Export types and utilities through `index.ts`
- Include package-specific README when needed

## Questions?

Feel free to open an issue or discussion if you have questions about contributing.

Thank you for contributing!
