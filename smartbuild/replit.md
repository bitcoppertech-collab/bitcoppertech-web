# SmartBuild APU Engine

## Overview

SmartBuild is a construction budget analysis and management platform (APU Engine) designed to streamline "Análisis de Precios Unitarios" (Unit Price Analysis) workflows for construction professionals. Its core purpose is to facilitate project creation, Excel budget analysis, material and pricing tracking, and provide dashboard analytics. The platform enables importing budgets, matching items to commercial materials, and monitoring costs against projected profits. SmartBuild aims to enhance efficiency in construction project management and financial oversight.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The project is a full-stack TypeScript monorepo with a React frontend, an Express backend, and a shared module for common definitions.

### Monorepo Structure
- `client/`: React Single Page Application
- `server/`: Express API server
- `shared/`: Common types, schemas, and route definitions

### Frontend
- **Framework**: React 18 with TypeScript
- **UI/UX**: shadcn/ui (New York style) based on Radix UI, styled with Tailwind CSS. Features a dark mode with an orange/construction accent.
- **Key Features**: Comprehensive dashboard, project management (including Excel upload and budget item analysis), a material library with live price comparisons (Sodimac/Easy), financing panel, company settings, and an admin panel. It also includes a commercial landing page, B2C marketplace with dual checkout, client and maestro dashboards, and a "Mi Obra Resguardada" client view for budget monitoring and protected payments.

### Backend
- **Framework**: Express.js with Node.js
- **API Pattern**: RESTful JSON API
- **AI Assistant**: OpenAI via Replit AI Integrations (gpt-5-mini) with a price catalog and bug reporting.
- **Specialized Systems**:
    - **Distributor/Referral System**: Manages partners and tracks referrals.
    - **Maestro Reputation System**: For workers to create profiles, track work, and receive ratings.
    - **KYC / Document Verification**: Supports multi-document verification with QR Universal badges.
    - **Crew Management ("Mi Cuadrilla")**: Maestros manage worker profiles, attendance, and payment summaries.
    - **Daily Work Log ("Bitácora de Obra")**: Photo uploads for work progress tracking, increasing Trust Level.
    - **Active Credit Algorithm**: Rewards consistent engagement with an "Insignia de Trabajador Activo" badge.
    - **Client Lead Capture & Referral**: Generates client leads and manages referral rewards.
    - **Custody Yield System**: Daily token rewards on frozen escrow balances.
    - **PDF Certificate Generator**: For "Certificado de Resguardo de Fondos".
    - **Bitcopper Wallet (Copper Credits)**: Ledger-based credit system for security fees and discounts.
    - **Quick Payment Links (WhatsApp Pay)**: Token-based payment links for instant client payments.
- **Price Engine**: A Chilean construction materials price simulation engine with a product catalog, fuzzy matching, and daily price variation simulation.

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with `drizzle-zod`.
- **Authentication**: Replit Auth (OIDC) with `express-session`.
- **Multi-Tenancy**: Data scoped by `owner_id`.
- **Database Schema**: Comprises 29 tables covering projects, users, maestos, work completions, reviews, crews, daily logs, client leads, payments, wallets, and rewards.

### Payment System
- **Payment Service**: Centralized `PaymentService` class handling payment creation, webhook processing, and transaction persistence. Manages payment splits and notifications.
- **Payment Switch**: Orchestrates transactions to optimal gateways (Fintoc, MercadoPago, Culqi) based on amount and country, with pluggable adapters. Implements an 85/12/3 split (ferretería/platform/maestro cashback).

### Internationalization
- **Country Config**: Separates core logic from country-specific settings (currency, taxes, payment gateways, thresholds) for Chile, Peru, and Colombia.

### Escrow Notifications
- **Trust Tracker**: Transparency notification system for various escrow states (deposit received, materials paid, milestone approvals, project completed) with a 5-stage visual timeline.

## External Dependencies

### Required Services
- **PostgreSQL Database**: Primary data persistence layer.

### Key NPM Packages
- **drizzle-orm, drizzle-kit, drizzle-zod**: Database ORM and schema tools.
- **express**: Backend web framework.
- **multer**: Handles file uploads.
- **xlsx**: Parses Excel files.
- **zod**: Schema validation.
- **@tanstack/react-query**: Manages server state in the frontend.
- **wouter**: Frontend routing.
- **react-hook-form**: Manages forms.
- **shadcn/ui, Radix UI**: Core UI component libraries.
- **recharts**: For data visualization and charts.
- **react-dropzone**: Implements drag-and-drop file uploads.