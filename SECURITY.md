# Security Policy

## Supported Versions

OpenProvider is early-stage. Only the latest release receives fixes.

## Reporting a Vulnerability

Please do not report security issues in public GitHub issues.

Report them privately through [GitHub security advisories](https://github.com/Albis0/OpenProvider/security/advisories/new).

When reporting, please include:

- A short summary of the issue
- Steps to reproduce, or a proof of concept
- Any logs, stack traces, or screenshots that help explain the problem

Please keep the details private until a fix is available.

## Scope

OpenProvider is a fork of [Cline](https://github.com/cline/cline). If a vulnerability also affects upstream Cline, please report it to [their program](https://github.com/cline/cline/security/advisories/new) as well — most of the code is theirs, and a fix there benefits far more users.

Issues specific to this fork are those in its own changes: the removal of Cline's hosted account, billing and telemetry services, the rebranding, and provider wiring.

## Handling of Credentials

Provider API keys are stored in VS Code's secret storage on your machine and are sent only to the provider you configured. This fork operates no backend: nothing is transmitted to OpenProvider or to Cline. The upstream PostHog telemetry and error reporting have been removed; only self-hosted OpenTelemetry export remains, and it is off unless you configure it yourself.
