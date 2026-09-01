# KPIsEcosystem v3

Generic multi-project Performance Management System.

## Core Flow
Project → Job Role → Responsibilities → Generate KPIs → Review/Drag & Drop → Save Template → Assign Employees → Evaluate → Reports

## Current Frontend MVP
- Multiple projects
- Job roles per project
- Responsibilities
- Smart local KPI generator
- KPI cards with weight/target editing
- Drag & drop ordering
- Save KPI templates
- Task management
- LocalStorage persistence

## Backend Migration
Run `supabase_schema_v3.sql` in Supabase SQL Editor.
It creates generic `kpe_*` tables and does NOT delete your existing `hr_*` tables.

## Stack
- Supabase
- GitHub
- Cloudflare
