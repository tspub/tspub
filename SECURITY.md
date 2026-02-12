# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.x     | Yes       |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, use [GitHub's private security advisory feature](https://github.com/tspub/tspub/security/advisories/new) to report vulnerabilities.

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Timeline

- **Acknowledgment:** within 48 hours
- **Initial assessment:** within 1 week
- **Fix or mitigation:** depends on severity, but we aim for 30 days for critical issues

## Scope

tspub is a development tool that runs locally. Security concerns most relevant to this project include:

- Command injection via malicious package.json fields
- Path traversal in file resolution
- Arbitrary code execution through plugin loading
- Supply chain risks in dependencies
