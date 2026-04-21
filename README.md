# Next.js Fullstack Starter Template

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?style=for-the-badge&logo=shadcnui&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white)

A modern, batteries-included Next.js 16 starter template pre-configured with the most popular tools in the React ecosystem.

## Features

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **UI & Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Authentication**: [Auth.js (NextAuth v5 beta)](https://authjs.dev/) with Edge Proxy routing
- **Data Fetching & State**: [TanStack React Query v5](https://tanstack.com/query)
- **Global State**: [Zustand](https://github.com/pmndrs/zustand)
- **Validation**: [Zod](https://zod.dev/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)
- **Icons**: Hugeicons
- **Package Manager**: [Bun](https://bun.sh/)

## Use This Template

Create a new project using this template:

```bash
bunx create-next-app@latest my-app --example https://github.com/dfanso/nextjs-shadcn-personal-template
```

Or with pnpm/npm/yarn:

```bash
pnpm dlx create-next-app@latest my-app --example https://github.com/dfanso/nextjs-shadcn-personal-template
# or
npx create-next-app@latest my-app --example https://github.com/dfanso/nextjs-shadcn-personal-template
```

## Getting Started

1. **Clone the repository and install dependencies**

```bash
bun install
```

2. **Set up Environment Variables**

Copy the `.env.example` file to `.env.local`:

```bash
cp .env.example .env.local
```

Make sure to generate a random secret for `AUTH_SECRET` (e.g., using `openssl rand -base64 32`).

3. **Run the development server**

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure Highlights

- `lib/auth.ts`: Auth.js core configuration and handlers
- `proxy.ts`: Next.js edge proxy protecting routes using NextAuth
- `components/providers/`: Root providers context (Session, Query)
- `components/ui/`: shadcn/ui base components
- `lib/stores/`: Zustand global state examples
