---
name: mbx-context
description: Contexte complet du projet MBX Réparations (alias MBX Mobilax) — application Next.js 16.2 / React 19 / TypeScript / Supabase / Vercel de gestion d'atelier de réparation de téléphones (clients, techniciens, réparations, devis, factures, paiements, portail client). Couvre stack précise, structure du repo, API routes, conventions, workflow Git (Conventional Commits, feature → develop → main), bugs connus, dette technique à nettoyer. À utiliser SYSTÉMATIQUEMENT dès que l'utilisateur travaille sur ou mentionne MBX, MBX Réparations, MBX Mobilax, le dossier repairshop, technophone.vercel.app, ou parle de bugs/features/refacto dans un contexte de réparation, devis, clients, techniciens, factures, paiements, tickets, ou portail client — même sans mention explicite du nom "MBX". Trigger aussi pour toute question de dev Next.js 16 + Supabase + shadcn/ui posée dans le contexte de cet utilisateur (TECHNO).
---

# MBX Réparations — Contexte projet

## Vue d'ensemble

**MBX Réparations** (alias **MBX Mobilax**) est une application Next.js 16 de gestion d'un atelier de réparation de téléphones et appareils mobiles, avec :

- **Dashboard pro** (admin / techniciens) : gestion clients, réparations, devis, factures, paiements, statistiques, historique, logs
- **Portail client** (`/client/*`) : suivi de réparation, soumission d'appareil, tickets, dashboard client
- **Système de licences** : `app/admin/licence/`, `app/admin/reactivate/`, `api/check-licences/` (modèle SaaS multi-comptes)
- **PWA installable** : `sw.js`, `manifest.json`, icônes light/dark générées
- **Assistants IA** : `AssistantPro` (interne, persona "Max", glassmorphism) et `AssistantPublic` (côté client)

**Coordonnées projet :**

- Repo local : `C:\Users\Lenovo\Desktop\mbx\repairshop`
- Déploiement prod : https://technophone.vercel.app
- Nom dans `package.json` : `my-project` (générique, à renommer un jour en `mbx-reparations`)
- Compte Vercel / Claude Pro : mbxrepair@gmail.com
- OS dev : Windows + PowerShell
- IDE : Claude Desktop + Claude Code

## Stack technique réelle

| Couche | Choix | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.6 |
| UI runtime | React | 19 |
| Langage | TypeScript (⚠️ `strict: false`, `allowJs: true`) | 5.7.3 |
| Backend | Supabase | `@supabase/supabase-js ^2.107.0` |
| Auth | **Custom JWT** (pas Supabase Auth) | `jsonwebtoken`, `bcryptjs`, `cookie` |
| UI components | **shadcn/ui** | `components.json` + ~30 `@radix-ui/*` |
| Styling | **Tailwind CSS** | 4.2.0 (`@tailwindcss/postcss`) |
| Animations | `framer-motion`, `tw-animate-css` | — |
| Forms / validation | `react-hook-form`, `@hookform/resolvers`, `zod` | — |
| Toasts / overlays | `sonner`, `vaul` | — |
| Charts | `recharts` | — |
| Tableaux / data | `xlsx` (export Excel) | — |
| PDF / QR | `jspdf`, `jspdf-autotable`, `html2canvas`, `qrcode`, `qrcode.react` | — |
| Emails | ⚠️ **3 libs cohabitent** : `nodemailer`, `resend`, `@emailjs/browser` | — |
| SDK IA | **Gemini** (`@google/generative-ai ^0.24.1`) + **Anthropic** (`@anthropic-ai/sdk ^0.102.0`) | — |
| Outils dev | `eslint ^9.39.4`, `prettier ^3.8.3`, `sharp` (icons), `tw-animate-css` | — |
| Analytics | `@vercel/analytics` | — |
| Package manager | pnpm | — |
| Déploiement | Vercel (preview deploys auto sur branches non-prod) | — |

## Structure du projet (résumée)

### `app/` — Routes App Router

```
