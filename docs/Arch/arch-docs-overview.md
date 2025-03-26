# Arch Documentation Overview

### Account Structure (`arch_accounts-structure.md`)
Defines the fundamental data structures for accounts in Arch, including AccountInfo and AccountMeta, which store state and are owned by programs.

### Local Validator Setup (`arch_guide_configLocalValidator.md`) 
Provides instructions for configuring a local validator with Bitcoin Testnet4, including configuration steps, logging setup, and deployment commands. 

### Build Guide (`arch_basics_build_guide.md`)
Walks through the process of building, deploying, and interfacing with Arch programs, using the GraffitiWall demo application as an example.

### Program Interaction (`arch_basics_program_interaction.md`)
Details how to communicate with deployed Arch programs through RPC connections, account management, and transaction submission.

### Lending Protocol Guide (`arch_guide_lending.md`)
Comprehensive guide for building a Bitcoin-based lending protocol on Arch Network, including core data structures and implementation steps.

### Oracle Program Guide (`arch_guide_oracle.md`)
Explains the implementation of oracle programs in Arch, focusing on state management and data updates without cross-program invocation.

### Nodes (`arch_nodes.md`)
Describes the different node types in the Arch Network stack, including bootnode, leader, validator, and lightweight validator roles.

### Program General (`arch_program_general.md`)
Explains the concept of programs as executable accounts in Arch, highlighting their stateless nature and interaction with other accounts.

### Project Setup (`arch_project_setup.md`)
Guide for setting up an Arch Network project using arch-cli, including prerequisites and deployment steps.

### Public Key (`arch_pubkey.md`)
Defines the Pubkey structure as a 256-bit integer derived from private keys, used for account identification.

### System Calls (`arch_syscalls.md`)
Documents the available syscalls for interacting with the virtual machine, including cross-program invocation and logging functions.

### System Instruction (`arch_systeminstruction.md`)
Details the System Program's role in account creation and management through SystemInstruction enum.

### System Functions (`arch_system-_functions.md`)
Outlines core system functions for program interactions, account management, and state transitions in Arch Network.

### UTXO (`arch_utxo.md`)
Explains the UTXO model in Arch Network, including structure, creation, and management of unspent transaction outputs.

### Entrypoint (`arch-_entrypoint.md`)
Describes the program entrypoint structure and handler function implementation for processing instructions in Arch programs.

### Runes Swap Setup (`btc_runes_swap_setup.md`)
Tutorial for building a decentralized application for swapping Bitcoin Runes tokens on Arch Network.

### Instructions and Messages (`arch_instructions_messages.md`)
Explains the fundamental components of Arch's transaction processing system, focusing on instruction structure and message handling.

### Documentation Index (`arch_docs.md`)
Provides links to various sections of Arch Network documentation, including RPC calls, getting started guides, and reference documentation.

### Bitcoin and Electrs Setup (`arch_bitcoin-electrs-setup.md`)
Comprehensive guide for setting up Bitcoin Core and Electrs components, including detailed configuration steps for both regtest and testnet4 environments, with troubleshooting tips and verification steps.

### Quick Development Setup (`arch_quick_setup.md`)
Streamlined setup process for experienced developers with a one-command installation script and basic verification steps for the Arch Network development environment.

### Quick Start Guide (`arch_quickstart.md`)
Entry-point guide providing an overview of the Arch Network development environment setup process, with estimated timeframes and multiple learning paths for different developer experience levels.