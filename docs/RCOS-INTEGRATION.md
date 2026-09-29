# RCOS integration

The desktop application and RCOS are separate repositories. RCOS owns the
workflow and kernel integration layer; this repository owns the Electron
client, web client, runtime assets, and desktop distribution pipeline. The
desktop app does not vendor the RCOS repository or copy its runtime state.

## Development setup

Clone both repositories next to each other, then run the desktop doctor from
this repository:

```bash
pnpm bootstrap
pnpm doctor:rcos-integration -- --rcos ../rcos
pnpm dev:desktop
```

The doctor is local-only. It checks the desktop package scripts, Node.js 24+
and pnpm 10.33.2 version floors, and the RCOS kernel source-package paths. It
does not read provider keys, contact a service, or mutate either repository.

Use a temporary `RCOS_HOME` when testing kernel commands from a desktop
development session. The RCOS repository documents the verification sequence
and the source-consolidation boundary:

<https://github.com/Foshowithit/rcos/blob/main/docs/desktop-integration.md>

## Release boundary

`pnpm bundle:desktop` creates a local build for the current platform. That
output is a development artifact until the platform release process signs and,
where applicable, notarizes it. Run the existing macOS release doctor against
an installed app when validating a release candidate:

```bash
pnpm doctor:macos-release /Applications/ZCode.app
```

Do not describe an unsigned local bundle as a public installer. Keep RCOS
integration changes in this repository small and link back to the RCOS PR when
the interface or kernel snapshot changes.
