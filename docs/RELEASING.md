# Releasing g-draft

This guide explains how to version and publish a new release of **g-draft** using the automated workflow with changesets.

## 1. Make Your Code Changes

Ensure your feature, fix, or enhancement is committed to your branch.

## 2. Build the Project

Before proceeding, make sure the TypeScript code is compiled:

```bash
pnpm run build
```

## 3. Generate a Changeset

Run:

```bash
pnpm run changeset:gen
```

Follow the prompts to:
- Select the packages that have changed
- Choose the appropriate bump type (patch, minor, major)
- Write a detailed description of the changes

This will create a new file in the `.changeset` directory.

## 4. Automated Release Process

The project uses GitHub Actions for automated versioning and publishing:

1. **Push your changes with the changeset**:
   ```bash
   git add .
   git commit -m 'feat: add new feature with changeset'
   git push
   ```

2. **Automated Versioning**: When changes are pushed to the `main` branch, the version workflow will:
   - Update the version in `package.json` based on your changesets
   - Update the `CHANGELOG.md` file
   - Remove the changeset files
   - Commit these changes
   - Create a GitHub tag for the version and push

3. **Automated Publishing and Release**: When a new tag is pushed, the publish workflow will:
   - Build the project
   - Publish the new version to npm
   - Create a GitHub release

## After the Release

- Check that the package is available on **npm** as `g-draft`.
- Verify the GitHub release was created in the repository.
- Ensure the documentation reflects the new version.
