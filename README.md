# lekko-setup-action

This [Action] installs the [`lekko`][lekko-cli] CLI in your GitHub Actions pipelines so that it can be
used by other actions.

After `lekko-setup-action` is run, the `lekko` command is available to other Actions in the pipeline's
`PATH`. You can also use the `lekko` command directly inside of workflow steps.

## Usage

Here's an example usage of `lekko-setup-action`:

```yaml
steps:
  # Run `git checkout`
  - uses: actions/checkout@v3
  # Install the `lekko` CLI
  - uses: lekkodev/lekko-setup-action@v1
  # Ensure that `lekko` is installed
  - run: lekko --version
```

## Configuration

### Input

You can configure `lekko-setup-action` with these parameters:

| Parameter      | Description                                        | Default            |
|:---------------|:---------------------------------------------------|:-------------------|
| `version`      | The version of [`lekko`][lekko-cli] to install | `v0.2.15` |
| `apikey`      | The Lekko apikey that provides you with access to Lekko developer resources |  |
| `github_token` | The GitHub token to use to install [`lekko`][lekko-cli]. Deprecated.   |                    |

> These parameters are derived from [`action.yml`](./action.yml). <br>
#### Version

If `version` is unspecified, a default version of `lekko` is installed:

```yaml
steps:
  - uses: actions/checkout@v3
  # Installs latest
  - uses: lekkodev/lekko-setup-action@v1
  - run: lekko --version
```

Use the `version` parameter to pin to a specific version:

```yaml
steps:
  - uses: actions/checkout@v3
  # Installs version 0.2.15
  - uses: lekkodev/lekko-setup-action@v1
    with:
      version: 0.2.15
  # Should output v0.2.15
  - run: lekko --version
```

To resolve the latest release from GitHub, you can specify `latest`, but this is **not**
recommended:

```yaml
steps:
  - uses: actions/checkout@v3
  - uses: lekkodev/lekko-setup-action@v1
    with:
      version: latest
  - run: lekko --version
```

#### API key

You must supply a `apikey` input so that the action can access Lekko's private [releases] page.

```yaml
steps:
  - uses: lekkodev/lekko-setup-action@v1
    with:
      apikey: ${{ secrets.LEKKO_DEVELOPER_APIKEY }}
```
This key can be made a repository or organization secret. See [Encrypted Secrets][secrets] for more information. 


[action]: https://docs.github.com/actions
[lekko-cli]: https://github.com/lekkodev/cli
[releases]: https://github.com/lekkodev/cli/releases
[secrets]: https://docs.github.com/en/actions/security-guides/encrypted-secrets
