# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2026-01-06] - Upgrade Django 6.0

### Security
- Updated Django dependency from `>=5.0,<6.0` to `>=5.0,<7.0` to include Django 6.0.
- Patched CVE-2025-13372 and CVE-2025-64460 via Django upgrade.

### Added
- Created `CHANGELOG.md` to track project history.

### Changed
- `backend/requirements.txt` updated to allow Django 6.0.

### Notes for Developers
- Ensure local development environments are rebuilt (`docker-compose build backend`) to pull the new Django version.
- Verify migrations if proposing changes to `core` models.
