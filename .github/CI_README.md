# GitHub Actions

This directory contains the CI configuration for ChatLab.

The main workflow is:

- `.github/workflows/deploy.yml`

The workflow builds Docker images, runs integration tests against SQL Server, and publishes application images to Docker Hub. It does not deploy the application to a remote server.

## Workflow Triggers

The workflow runs on:

- push to `main`,
- pull requests targeting `main`,
- manual execution with `workflow_dispatch`.

Pull requests are used only for validation. They build Docker images and run tests, but they do not push images to Docker Hub.

Pushes to `main` and manual runs build, test, and publish Docker images to Docker Hub.

## Jobs

### `build`

The `build` job:

1. Checks out the repository.
2. Logs in to Docker Hub for non-PR runs.
3. Builds Docker images with Docker Compose.
4. Pushes application images to Docker Hub for non-PR runs.

The images pushed to Docker Hub are:

- `${DOCKERHUB_USERNAME}/chatlab-coreservice:latest`
- `${DOCKERHUB_USERNAME}/chatlab-problemservice:latest`
- `${DOCKERHUB_USERNAME}/chatlab-socketio:latest`
- `${DOCKERHUB_USERNAME}/chatlab-gateway:latest`
- `${DOCKERHUB_USERNAME}/chatlab-webclient:latest`

The SQL Server image is not built or pushed. It is pulled from Microsoft Container Registry:

- `mcr.microsoft.com/mssql/server:2022-latest`

### `test`

The `test` job:

1. Starts a SQL Server service container.
2. Installs .NET 8.
3. Restores the solution.
4. Runs integration tests from the solution.

The tests use the environment variable:

```text
TEST_SQLSERVER_CONNSTR=Server=localhost,1433;User Id=sa;Password=Your_password123;TrustServerCertificate=True;MultipleActiveResultSets=true
```

This forces the integration tests to use SQL Server running in Docker instead of Windows LocalDB.

The test projects covered by the solution are:

- `src/Tests/CoreService.IntegrationTests`
- `src/Tests/ProblemService.IntegrationTests`

## Required GitHub Secrets

The workflow requires the following repository secrets for non-PR runs:

| Secret | Description |
| --- | --- |
| `DOCKERHUB_USERNAME` | Docker Hub username or organization name used as the image namespace. |
| `DOCKERHUB_TOKEN` | Docker Hub access token used to push images. |

Use a Docker Hub access token instead of the Docker Hub account password.

## What Happens After Docker Hub

The workflow stops after publishing images to Docker Hub. Deployment is intentionally not performed by GitHub Actions.

To deploy the application elsewhere, pull the published images and start the stack with Docker Compose using the same `DOCKERHUB_USERNAME` value:

```bash
DOCKERHUB_USERNAME=<dockerhub-user-or-org> docker compose pull
DOCKERHUB_USERNAME=<dockerhub-user-or-org> docker compose up -d --no-build
```

## Concurrency

The workflow uses concurrency:

```yaml
concurrency:
  group: docker-publish-${{ github.ref }}
  cancel-in-progress: true
```

If multiple workflow runs are started for the same branch, the newer run cancels the older one.

## Timeouts

Each job has a timeout:

- `build`: 20 minutes
- `test`: 10 minutes

This prevents stalled builds or tests from running indefinitely.

## Permissions

The workflow uses minimal repository permissions:

```yaml
permissions:
  contents: read
```

The workflow only needs read access to repository contents because image publishing is handled through Docker Hub credentials stored in GitHub Secrets.
