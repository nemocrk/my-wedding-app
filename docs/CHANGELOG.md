# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-01-08

### Fixed
- **Frontend-Admin**: Converted WhatsApp tests from Jest to Vitest syntax to resolve CI failures.
- **Frontend-User**: Fixed JSON syntax error in `package.json` (missing comma).
- **Backend**: Updated `AccommodationSerializer` to correctly handle `rooms` creation using write-only field, ensuring 201 Created on valid input.

### Added
- **CI/CD**: Improved test reliability for frontend and backend pipelines.

## [0.2.0] - 2026-01-05

### Added
- **WhatsApp Integration**: Complete module for messaging guests via Green API.
- **Message Queue**: Celery task for asynchronous message delivery.
- **Admin Dashboard**: New section for monitoring WhatsApp queue status.

### Changed
- **Backend**: Updated dependencies to support new async tasks.
- **Docs**: Added documentation for WhatsApp module configuration.

## [0.1.0] - 2025-12-20

### Added
- Initial Release of My-Wedding-App.
- Core RSVP functionality.
- Admin dashboard for guest management.
- Docker-based infrastructure.
