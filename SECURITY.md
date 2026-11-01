# Security Policy

## Reporting a vulnerability

Please report security issues privately through GitHub's
[private vulnerability reporting](../../security/advisories/new) for this repository,
or email editorial@industrycontents.com. Do not open a public issue for a vulnerability.

You can expect an acknowledgement within five working days.

## Supported versions

Only the latest commit on the default branch receives security fixes.

## Secrets

This repository must never contain credentials. Local configuration belongs in an
untracked `.env` file; `.env.example` lists the variable names only.
