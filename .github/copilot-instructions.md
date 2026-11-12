# Copilot Code Review Instructions

## Project Context

MeuAzulao (FinTrack) is a Brazilian family financial management app built as a monorepo:

- `packages/web` — Next.js 14 landing page + web dashboard
- `packages/mobile` — Expo SDK 54 / React Native (iOS + Android)
- `packages/backend` — Express API (Vercel serverless)
- `packages/shared` — Shared utilities and design tokens

## Tech Stack

- **Database**: Supabase PostgreSQL with RLS policies
- **Auth**: Supabase Auth (email + magic link)
- **State**: React hooks + context (no Redux)
- **Icons**: Lucide React Native (UI) + Phosphor React Native duotone (financial categories)
- **Navigation**: React Navigation 6 (bottom tabs + stack)
- **Styling**: StyleSheet.create with dynamic theme via useTheme() hook

## Review Guidelines

### Must Check
- **Security**: No hardcoded secrets, API keys, or tokens. Supabase RLS must be respected.
- **Theme compliance**: All screens must use `useTheme()` hook for colors, never static `colors` import in StyleSheet.
- **Icon consistency**: No emojis in UI — use Lucide or Phosphor icons only.
- **Phosphor imports**: Must use direct imports (`phosphor-react-native/lib/module/icons/IconName`) — barrel exports crash Metro.
- **Brazilian locale**: Currency formatting uses `formatCurrency()` from shared, dates use pt-BR.
- **Performance**: No unnecessary re-renders, heavy computations in useMemo/useCallback.

### Code Style
- Functional components only, no class components.
- Prefer `const` over `let`. No `var`.
- No comments unless explaining a non-obvious WHY.
- Portuguese for user-facing strings, English for code identifiers.

### Design System — "Azulao Premium"
- Primary: `#1A6AFF` (Azulao Blue)
- Accent: `#F5A623` (Gold — FAB button)
- Expense: `#FF3B30`, Income: `#34C759`
- Dark mode: bg `#0A0A0A`, surface `#1C1C1E`, elevated `#262626`
- Border radius: 14px for cards, 12px for buttons, `size * 0.28` for category icons
- Large titles (34px/800 weight) on main screens

### What NOT to Flag
- Missing TypeScript (project uses JavaScript intentionally)
- Missing PropTypes (not enforced in this project)
- `continue-on-error: true` in CI for web jobs (known — web has legacy lint issues)
