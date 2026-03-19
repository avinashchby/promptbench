# Project Overview

This is a Node.js web API built with Express and TypeScript.

## Tech Stack

- Runtime: Node.js 20
- Framework: Express.js
- Language: TypeScript
- Database: PostgreSQL with raw SQL queries
- Testing: Vitest
- Package manager: pnpm

## Build Commands

- `pnpm install` - Install dependencies
- `pnpm run build` - Build the project
- `pnpm run test` - Run tests
- `pnpm run lint` - Run linter

## Coding Style

- Use 2 spaces for indentation
- Use single quotes for strings
- No semicolons
- Max function length: 50 lines
- Max file length: 300 lines
- Use `interface` over `type` where possible
- Never use `any` type

## Error Handling

- Always wrap async operations in try/catch
- Use custom error classes that extend Error
- Return proper HTTP status codes
- Log errors with structured logging

## Testing

- Write unit tests for all business logic
- Use Vitest with `describe`/`it`/`expect`
- Aim for >80% coverage
- Mock external services, not database

## Git Conventions

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`
- Keep commits small and focused
- Write descriptive commit messages

## Communication Style

- Be direct and concise
- Explain decisions with reasoning
- Use code examples when helpful
