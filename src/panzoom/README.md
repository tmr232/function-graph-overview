# Render Frontend

This is a frontend for rendering code from GitHub directly.

Navigate to it, and use `?github=<GitHub URL>`,
making sure to include the line number for your function (`#L123`) at the end of the URL (encoded as `%23`).

To choose color scheme pass `colors=light` or `colors=dark`. Default is dark.

Served at [`/render`](https://tmr232.github.io/function-graph-overview/render).

## Useful Commands

```shell
# Run locally
bun render

# Build
bun build-render
```