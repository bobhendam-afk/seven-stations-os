# KPIsEcosystem v4

A generic multi-project KPI and Performance Management MVP.

## Working Modules
- Projects
- Job Roles + Responsibilities
- KPI Generator
- KPI Templates
- Full Template Editor:
  - Edit KPI name
  - Edit weight
  - Edit target
  - Edit type
  - Edit formula
  - Add manual KPI
  - Delete KPI
  - Drag & Drop reorder
- Tasks
- Employees
- Employee → Project → Role → KPI Template linking
- Evaluations
- Automatic KPI score and weighted score
- Final performance score
- Reports:
  - Evaluation count
  - Average score
  - Top score
  - Low score
  - Top performers
  - Needs attention
  - Detailed report table

## Storage
Current MVP uses browser localStorage.

## Next production step
Replace localStorage operations with Supabase CRUD + Auth + RLS.
