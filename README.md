# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  # Llama AI Frontend

  Modern SaaS-style AI chat frontend built with React, Vite, Supabase Auth, Supabase Postgres persistence, and streaming responses.

  ## Features

  - Google and email/password login with Supabase Auth
  - Conversation sidebar with resume + active highlighting
  - Persisted chats (`conversations`, `messages`)
  - Streaming output + stop generation support
  - Markdown rendering with syntax highlighted code blocks
  - Copy code, copy message, and share message actions
  - Light/dark theme toggle and settings modal
  - Responsive layout for desktop/tablet/mobile

  ## Environment

  Create a `.env` from `.env.example` and set:

  ```bash
  VITE_SUPABASE_URL=...
  VITE_SUPABASE_ANON_KEY=...
  ```

  ## Run

  ```bash
  npm install
  npm run dev
  ```

  ## Build

  ```bash
  npm run build
  ```
    files: ['**/*.{ts,tsx}'],
