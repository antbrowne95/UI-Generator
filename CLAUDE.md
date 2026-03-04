# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development server (uses Turbopack)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/lib/__tests__/file-system.test.ts

# Reset database
npm run db:reset

# Regenerate Prisma client after schema changes
npx prisma generate && npx prisma migrate dev
```

All Next.js commands require `NODE_OPTIONS='--require ./node-compat.cjs'` (already included in npm scripts).

## Architecture

UIGen is an AI-powered React component generator. Users describe components in chat; Claude generates/edits code via tool calls; the result is previewed live in an iframe.

### Core Data Flow

1. User sends a chat message → `POST /api/chat` (`src/app/api/chat/route.ts`)
2. The API reconstructs a `VirtualFileSystem` from serialized client state and passes it to `streamText` via two tools: `str_replace_editor` and `file_manager`
3. Claude edits the virtual filesystem through tool calls (create, str_replace, insert, rename, delete)
4. The client's `ChatContext` receives tool call events and applies them to its own `VirtualFileSystem` instance via `handleToolCall`
5. `PreviewFrame` detects filesystem changes (via `refreshTrigger`), transforms all JSX/TSX files with Babel, creates blob URLs, injects an import map into an iframe, and renders the app live

### Virtual File System (`src/lib/file-system.ts`)

`VirtualFileSystem` is an in-memory tree structure — no files are ever written to disk. It supports standard operations (create, read, update, delete, rename) plus text-editor commands (`viewFile`, `replaceInFile`, `insertInFile`).

Serialization between client and server: `serialize()` → `Record<string, FileNode>` (plain objects) → sent in request body → `deserializeFromNodes()` reconstructs the tree on the server.

### React Contexts

- **`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`): Wraps `VirtualFileSystem` with React state. Exposes `handleToolCall` which interprets `str_replace_editor` and `file_manager` tool results and updates the VFS. Uses a `refreshTrigger` counter to notify consumers.
- **`ChatContext`** (`src/lib/contexts/chat-context.tsx`): Uses Vercel AI SDK's `useChat`, wires `onToolCall` to `FileSystemContext.handleToolCall`, and sends the serialized filesystem with every request.

### Preview System (`src/lib/transform/jsx-transformer.ts`)

`createImportMap` transforms all JSX/TSX files using `@babel/standalone` and creates blob URLs for each. It builds a browser import map that:
- Maps `react`, `react-dom`, `react/jsx-runtime` to `esm.sh`
- Maps local files (with and without extensions, with `@/` alias) to their blob URLs
- Maps unknown third-party packages to `https://esm.sh/<package>`
- Creates placeholder stub modules for missing local imports

`createPreviewHTML` injects this import map, Tailwind CDN, and a React error boundary into an iframe's `srcdoc`.

### AI Tools (`src/lib/tools/`)

- **`str_replace_editor`**: View, create, str_replace, and insert operations on the VFS — mirrors Anthropic's standard text editor tool interface
- **`file_manager`**: Rename and delete operations

### Authentication (`src/lib/auth.ts`)

JWT-based auth using `jose`. Sessions stored in an httpOnly cookie (`auth-token`). `getSession()` is server-only. `verifySession()` is used in middleware for protected API routes. Anonymous users can work without logging in; their work is tracked in `localStorage` via `src/lib/anon-work-tracker.ts`.

### Persistence (Prisma + SQLite)

The database schema is defined in `prisma/schema.prisma` — reference it anytime you need to understand the structure of data stored in the database.

Schema: `User` (email/password with bcrypt) → `Project` (name, messages as JSON string, VFS data as JSON string). The `messages` and `data` columns store stringified JSON. Projects are saved in the `onFinish` callback of `streamText` only when authenticated.

Prisma client is generated to `src/generated/prisma/` (not the default location).

### Key Paths

| Path | Purpose |
|------|---------|
| `src/app/api/chat/route.ts` | AI streaming endpoint |
| `src/lib/file-system.ts` | VirtualFileSystem class |
| `src/lib/contexts/file-system-context.tsx` | VFS React context |
| `src/lib/contexts/chat-context.tsx` | Chat state with Vercel AI SDK |
| `src/lib/transform/jsx-transformer.ts` | Babel + import map for live preview |
| `src/components/preview/PreviewFrame.tsx` | iframe preview component |
| `src/lib/tools/` | Tool definitions for AI |
| `src/lib/prompts/generation.tsx` | System prompt for component generation |
| `src/lib/auth.ts` | JWT session management (server-only) |
| `prisma/schema.prisma` | Database schema |

### Testing

Tests use Vitest with jsdom and `@testing-library/react`. Test files live in `__tests__` subdirectories next to source files. The `@/` path alias works in tests via `vite-tsconfig-paths`.

## Code Style

Use comments sparingly — only for complex logic that isn't self-evident from the code.
