# Moodle Native Rewrite

## Purpose

This document explains the first pass of the major rewrite needed to move the current proctoring stack toward Moodle-owned PHP pages, storage, and control surfaces.

The current repo still contains:

- a Fastify backend in `backend/`
- a Next.js teacher dashboard in `frontend/`
- an Electron student client in `manual_proctoring/`
- a Python AI service in `ai_proctoring/`

This pass adds the first Moodle-native foundation under `moodle-plugin/local/dscproctor/`.

## What This Pass Adds

Plugin path:

- `moodle-plugin/local/dscproctor/`

Files added in this pass:

- `version.php`
- `db/access.php`
- `db/install.xml`
- `settings.php`
- `lib.php`
- `index.php`
- `teacher_dashboard.php`
- `student_launch.php`
- `classes/local/repository.php`
- `classes/local/legacy_backend_client.php`
- `lang/en/local_dscproctor.php`

What these files do:

- create a real Moodle local plugin named `local_dscproctor`
- define native Moodle tables for exams, rooms, attempts, and violations
- add Moodle capabilities for dashboard access, student launch, and rewrite administration
- add Moodle admin settings for hybrid migration
- add native Moodle teacher and student entry pages
- add a small PHP service wrapper that can check legacy backend health during migration

## Important Scope Note

This is not the full rewrite yet.

It is the foundation for the rewrite.

The new plugin does not yet replace:

- the Electron kiosk and process-kill behavior
- the Fastify API surface
- the Python AI inference service
- the Next.js dashboard features

What it does do is move the ownership boundary:

- Moodle now has its own plugin
- Moodle now has its own proctoring tables
- Moodle now has its own pages and settings
- later passes can move features into these surfaces instead of keeping everything in Node

## Why A Local Plugin First

A `local` plugin is the safest first landing zone because it lets us:

- create site-level admin settings
- define shared schema without depending on a specific activity module yet
- add native pages for teachers and students
- run hybrid mode while we migrate behavior from the legacy stack

Later, we may split this into:

- `mod_proctoredexam` for exam activity ownership
- `local_dscproctor` for shared services, rewrite utilities, and admin controls
- `report_*` or `block_*` plugins for monitoring and reporting views

## Current Native Data Model

The first pass defines these Moodle tables:

- `local_dscproctor_exam`
- `local_dscproctor_room`
- `local_dscproctor_attempt`
- `local_dscproctor_violation`

These tables are the native Moodle-side replacement targets for the current PostgreSQL-backed entities in the Fastify backend.

### Table Intent

`local_dscproctor_exam`

- native registry of Moodle-side exams we want to proctor
- keeps links to course and optional legacy exam IDs

`local_dscproctor_room`

- native registry of room or session ownership
- replaces the current room control model step by step

`local_dscproctor_attempt`

- native attempt lifecycle storage
- replaces the current backend attempt records step by step

`local_dscproctor_violation`

- native violation log
- replaces the current backend violation storage step by step

## How To Install The Plugin

### Option 1: Copy Into A Moodle Checkout

Copy this folder:

- `moodle-plugin/local/dscproctor`

Into your Moodle codebase here:

- `<moodle-root>/local/dscproctor`

Then visit:

- `Site administration -> Notifications`

Moodle will detect the plugin and install its tables.

### Option 2: Use With The Docker Moodle In This Repo

This repo currently runs Moodle in Docker, but the plugin is not auto-mounted into the Moodle container yet.

For now, the simplest workflow is:

1. Start the Moodle stack.
2. Copy `moodle-plugin/local/dscproctor` into the running Moodle code volume or the local Moodle checkout used by the container.
3. Visit `Site administration -> Notifications`.

If we want, the next pass can add a Docker bind mount specifically for this plugin.

## Plugin Settings

After installation, open:

- `Site administration -> Plugins -> Local plugins -> DSC Proctor Rewrite`

Available settings:

- `Enable hybrid mode`
- `Legacy backend URL`
- `Legacy teacher dashboard URL`
- `Legacy AI service URL`
- `Student launch mode`

### Recommended First-Pass Settings

- Hybrid mode: `enabled`
- Legacy backend URL: `http://localhost:5000`
- Legacy teacher dashboard URL: `http://localhost:3000`
- Legacy AI service URL: `http://localhost:8000`
- Student launch mode: `Hybrid Electron launch`

This lets Moodle own the rewrite entry points while the old services still exist.

## Native Pages Added

### Rewrite Landing Page

Path:

- `/local/dscproctor/index.php`

Use this page to:

- confirm the plugin is installed
- view native counts
- check hybrid migration status
- jump to teacher and student rewrite surfaces

### Teacher Dashboard Surface

Path:

- `/local/dscproctor/teacher_dashboard.php`

Use this page to:

- view native exam registry rows
- view native attempts
- view native violations
- keep a migration bridge to the legacy teacher UI during the rewrite

### Student Launch Surface

Path:

- `/local/dscproctor/student_launch.php`

Use this page to:

- expose a Moodle-owned student launch page
- show native exam and room registry state
- keep hybrid launch guidance while Electron behavior is still being replaced

## Rewrite Strategy By Pass

### Pass 1

Done in this turn.

Goals:

- create Moodle plugin
- create native schema
- add native pages
- add hybrid settings
- establish rewrite ownership inside Moodle

### Pass 2

Recommended next.

Goals:

- add Moodle external functions and AJAX endpoints
- move teacher read models into Moodle PHP
- replace `/api/teacher/*` reads with Moodle-owned services

Likely files:

- `db/services.php`
- `classes/external/*.php`
- `amd/src/*.js`

### Pass 3

Goals:

- move room creation and room activation into Moodle
- move attempt start and submit flows into Moodle
- map Moodle users and course modules directly instead of inferring from the legacy backend

### Pass 4

Goals:

- move violation recording into Moodle-owned endpoints
- move live monitoring metadata and room state into Moodle tables
- treat the old backend as a shrinking compatibility bridge only

### Pass 5

Goals:

- fully decommission the Fastify backend

Or:

- keep only a narrow sidecar service for AI and WebRTC that Moodle controls directly

## Critical Constraint

The Electron app currently does things a normal Moodle web page cannot do directly:

- kiosk and fullscreen enforcement
- encrypted local storage via Electron safe storage
- reading the running process list
- killing blocked desktop apps

That means a true browser-only Moodle rewrite needs replacement controls, not just PHP rewrites.

Realistic replacements include:

- Safe Exam Browser
- Moodle quiz access rules
- institutional device management policy
- browser-permission based webcam and microphone flows

So the rewrite is not only a PHP rewrite. It is also a control-model rewrite.

## How To Work On This Rewrite

### Rule 1

Do not try to delete the old system first.

Use hybrid mode and move one feature slice at a time.

### Rule 2

Treat `moodle-plugin/local/dscproctor/` as the new source of truth for native ownership.

Even if a feature still proxies to legacy services, the entry point should move into Moodle first.

### Rule 3

Move reads before writes.

Recommended order:

1. teacher read dashboards
2. room reads and room control
3. attempt lifecycle writes
4. violation writes
5. student launch
6. monitoring orchestration

### Rule 4

Keep legacy IDs in the Moodle plugin tables during migration.

This is why the schema already includes:

- `legacyexamid`
- `legacyroomid`
- `legacyattemptid`

They let us sync or bridge without losing traceability.

## Suggested Immediate Next Tasks

1. Add plugin auto-mount support to the Moodle Docker workflow.
2. Add a `db/services.php` layer so Moodle can serve teacher dashboard data directly.
3. Add a sync command that imports current PostgreSQL exams and attempts into Moodle plugin tables.
4. Replace the current teacher dashboard read calls with Moodle-native endpoints.

## Repo Paths To Know

- Plugin root: `moodle-plugin/local/dscproctor/`
- Legacy backend: `backend/`
- Legacy teacher UI: `frontend/`
- Legacy student desktop client: `manual_proctoring/`
- Legacy AI service: `ai_proctoring/`

## Status After This Pass

You now have a real Moodle plugin foundation in the repo.

That means the answer has changed from:

- "there is no Moodle-native code"

To:

- "the rewrite has started, but major migration passes still remain"
