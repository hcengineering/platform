# Huly Utils

Huly Utils is a monorepo managed by [Rush](https://rushjs.io/) that contains build tools to Huly platform.
This repository is structured to support scalable development and efficient collaboration.

## Repository Structure

The repository is organized as follows:

```plaintext
common/
  config/       # Configuration files for Rush and other tools
  git-hooks/    # Git hooks for the repository
  scripts/      # Utility scripts for managing the repository
  temp/         # Temporary files and caches
packages/
  platform-rig/         # Platform rig utilities
```

## Getting Started

### Prerequisites

- **Node.js**: Ensure you have a supported version of Node.js installed. This repository supports:
  - `>=18.20.3 <19.0.0`
  - `>=20.14.0 <21.0.0`
- **PNPM**: This repository uses PNPM as the package manager. The required version is `10.15.1`.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/hcengineering/huly.utils.git
   cd huly.utils
   ```

2. Install dependencies using Rush:

   ```bash
   rush install
   ```

### Building the Repository

To build all projects in the repository, run:

```bash
rush build
```

### Running Tests

To run tests for all projects, use:

```bash
rush test
```

## Packages

### `@hcengineering/platform-rig`

A set of utilities for managing platform configurations and profiles.

### `@hcengineering/measurements`

Utilities for handling various measurement-related tasks.

### `@hcengineering/measurements-otlp`

OpenTelemetry-based utilities for measurements and telemetry.

### `@hcengineering/postgres-base`

Base utilities for working with PostgreSQL databases.

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit your changes and push the branch.
4. Open a pull request.

## License

This project is licensed under the terms of the [MIT License](./LICENSE).

## Additional Resources

- [Rush Documentation](https://rushjs.io/)
- [PNPM Documentation](https://pnpm.io/)
