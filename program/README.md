# OTORI Vision Program

This directory contains the OTORI Vision program for the Arch Network.

## Structure

```
program/
├── src/           # Source code for the Arch program
├── tests/         # Tests for the Arch program
├── examples/      # Example usage
├── Cargo.toml     # Rust dependencies
└── README.md      # This file
```

## Development

To develop and test the Arch program, you will need:

1. Arch SDK installed
2. Rust toolchain (with appropriate version)
3. Access to Arch Network (testnet or local node)

## Building

```bash
cargo build
```

## Testing

```bash
cargo test
```

## Deploying

To deploy to the Arch Network, use the Arch CLI:

```bash
arch program deploy
```

Refer to the Arch Network documentation for detailed deployment instructions.

## Integration with Frontend

The frontend application connects to this program using the Arch client library. 
See `src/hooks/useArchClient.ts` in the frontend directory for integration details. 