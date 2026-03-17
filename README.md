# Vibe Coding App

An AI-powered coding assistant platform with a Next.js admin dashboard and React Native mobile app. Built on a Turborepo monorepo architecture with tRPC, Drizzle ORM, and E2B sandbox execution.

## Tech Stack

| Layer         | Technology                            |
| ------------- | ------------------------------------- |
| **Monorepo**  | Turborepo + pnpm workspaces           |
| **Web Admin** | Next.js 15, React 19, Tailwind CSS v4 |
| **Mobile**    | React Native, Expo SDK 53, NativeWind |
| **API**       | tRPC v11 (type-safe client/server)    |
| **Database**  | PostgreSQL (Supabase) + Drizzle ORM   |
| **Auth**      | Better Auth with OAuth support        |
| **AI**        | Claude/OpenAI integration             |
| **Sandboxes** | E2B for secure code execution         |
| **UI**        | shadcn/ui components                  |

## Project Structure

```
├── apps/
│   ├── admin/              # Next.js 15 admin dashboard
│   └── mobile/             # React Native Expo app
├── packages/
│   ├── api/                # tRPC router definitions
│   ├── auth/               # Authentication utilities
│   ├── db/                 # Database schema & Drizzle client
│   ├── agents/             # AI agent orchestration
│   ├── jobs/               # Background job processing
│   ├── e2b/                # E2B sandbox integration
│   ├── ui/                 # Shared shadcn/ui components
│   └── validators/         # Zod validation schemas
├── tooling/
│   ├── eslint/             # Shared ESLint presets
│   ├── prettier/           # Shared Prettier config
│   ├── tailwind/           # Shared Tailwind config
│   └── typescript/         # Shared tsconfig
└── sandbox-templates/      # E2B sandbox templates
```

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9
- **PostgreSQL** database (Supabase recommended)
- **Xcode** (iOS development) or **Android Studio** (Android development)

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Required environment variables:

- `POSTGRES_URL` - PostgreSQL connection string
- `AUTH_SECRET` - Authentication secret key
- `ANTHROPIC_API_KEY` - Claude API key (optional)
- `GEMINI_API_KEY` - Gemini API key (optional)
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `E2B_API_KEY` - E2B sandbox API key (optional)
- `DAYTONA_API_KEY` - Daytona API key (optional)

### 3. Setup Database

```bash
pnpm db:push
```

### 4. Start Development

```bash
# All apps
pnpm dev

# Web admin only
pnpm dev:next

# Mobile only
pnpm -F @acme/mobile dev
```

## Commands

### Development

| Command                        | Description                |
| ------------------------------ | -------------------------- |
| `pnpm dev`                     | Start all apps in dev mode |
| `pnpm dev:next`                | Start Next.js admin only   |
| `pnpm -F @acme/mobile dev`     | Start mobile app           |
| `pnpm -F @acme/mobile ios`     | Run on iOS simulator       |
| `pnpm -F @acme/mobile android` | Run on Android emulator    |

### Database

| Command            | Description             |
| ------------------ | ----------------------- |
| `pnpm db:push`     | Push schema to database |
| `pnpm db:studio`   | Open Drizzle Studio     |
| `pnpm db:generate` | Generate migrations     |

### Build & Quality

| Command          | Description          |
| ---------------- | -------------------- |
| `pnpm build`     | Build all packages   |
| `pnpm lint`      | Lint all packages    |
| `pnpm lint:fix`  | Auto-fix lint issues |
| `pnpm format`    | Format with Prettier |
| `pnpm typecheck` | Run type checking    |

### Testing

| Command                         | Description                |
| ------------------------------- | -------------------------- |
| `pnpm -F @acme/mobile test`     | Run mobile unit tests      |
| `pnpm -F @acme/mobile e2e-test` | Run E2E tests (Playwright) |

### E2B Templates

| Command                        | Description              |
| ------------------------------ | ------------------------ |
| `pnpm template:build:nextjs`   | Build Next.js sandbox    |
| `pnpm template:build:expo`     | Build Expo sandbox       |
| `pnpm template:publish:nextjs` | Publish Next.js template |

## Database Schema

Key tables:

| Table      | Purpose                          |
| ---------- | -------------------------------- |
| `user`     | User authentication data         |
| `project`  | User projects                    |
| `message`  | Chat messages (USER/ASSISTANT)   |
| `fragment` | Code fragments with sandbox URLs |
| `llm_key`  | API keys for Claude/OpenAI       |

## Adding Components

### UI Components (shadcn/ui)

```bash
pnpm ui-add
```

### New Package

```bash
pnpm turbo gen init
```

## Mobile Development

### iOS Setup

1. Install Xcode and Command Line Tools
2. Open simulator manually once: `npx expo start` → press `i`
3. Run `pnpm -F @acme/mobile ios`

### Android Setup

1. Install [Android Studio](https://docs.expo.dev/workflow/android-studio-emulator)
2. Configure emulator
3. Run `pnpm -F @acme/mobile android`

## Deployment

### Next.js Admin (Vercel)

1. Create Vercel project with `apps/admin` as root
2. Add environment variables
3. Deploy

### Mobile App (EAS)

```bash
# Install EAS CLI
pnpm add -g eas-cli

# Login and configure
eas login
cd apps/mobile
eas build:configure

# Build
eas build --platform ios --profile production

# Submit
eas submit --platform ios --latest
```

## Architecture Notes

- **Type Safety**: Full end-to-end type safety via tRPC
- **Edge Compatible**: Database client works on Vercel Edge
- **Package Isolation**: `@acme/api` is dev-only in mobile app (no backend code leakage)
- **AI Agents**: Orchestrated via `@acme/agents` logic using LangGraph for stateful execution
- **Code Execution**: Secure sandboxed execution via E2B

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT
