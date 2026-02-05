# files rules

Ensure published files are correct — no sensitive files, proper shebang, valid dependencies.

## Rules (7)

| Rule | Description | Severity | Fixable |
|------|-------------|----------|---------|
| [`files-field`](./files-field) | Check that files field exists and is configured correctly | :yellow_circle: warning | :wrench: |
| [`sensitive`](./sensitive) | Check for sensitive files in published package and dist | :red_circle: error |  |
| [`bin-shebang`](./bin-shebang) | Check that bin files have a shebang line | :yellow_circle: warning |  |
| [`all-files-format`](./all-files-format) | Check that all JS files match their expected module format (when no exports field) | :yellow_circle: warning |  |
| [`prepublish`](./prepublish) | Check that prepublishOnly script exists | :yellow_circle: warning | :wrench: |
| [`duplicate-dep`](./duplicate-dep) | Check for packages in both dependencies and devDependencies | :red_circle: error |  |
| [`local-dependency`](./local-dependency) | Error on file:/link: protocol deps, warn on workspace: protocol | :red_circle: error |  |
