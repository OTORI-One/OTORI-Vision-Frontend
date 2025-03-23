# Universal Development Standards

## 0. Project Rules

**Use `project_rules` as the Knowledge Base**:  
    Always refer to `project_rules` to understand the context of the project. Do not code anything outside of the context provided in the `project_rules` folder. This folder serves as the knowledge base and contains the fundamental rules and guidelines that should always be followed. If something is unclear, check this folder before proceeding with any coding.
    
**Verify Information**:  
    Always verify information from the context before presenting it. Do not make assumptions or speculate without clear evidence.
    
**Follow `implementation-plan.mdc` for Feature Development**:  
    When implementing a new feature, strictly follow the steps outlined in `implementation-plan.mdc`. Every step is listed in sequence and must be completed in order. After completing each step, update `implementation-plan.mdc` with the word "Done" and a two-line summary of what steps were taken. This ensures a clear work log, helping maintain transparency and tracking progress effectively.

## 1. Code Quality Principles

### 1.1 Code Organization
- Follow Single Responsibility Principle
- Keep functions/methods small and focused
- Use meaningful names for all identifiers
- Separate concerns appropriately
- Use explicit, descriptive variable names over short, ambiguous ones
- Follow consistent coding style throughout the project
- Implement modular design for improved maintainability and reusability
- Avoid magic numbers; use named constants for clarity

### 1.2 Documentation
- Document all public interfaces
- Include rationale for non-obvious implementation choices
- Maintain up-to-date documentation
- Use consistent documentation format

### 1.3 Error Handling
- Use proper error propagation
- Implement graceful degradation
- Provide meaningful error messages
- Log errors with appropriate context
- Use assertions to validate assumptions and catch potential errors early
- Handle all potential edge cases, especially in critical paths

### 1.4 Security and Performance
- Take a security-first approach in all implementation decisions
- Consider performance implications of code changes
- Verify compatibility with project's specified language/framework versions
- Implement appropriate security measures based on data sensitivity
- Review code for potential security vulnerabilities

## 2. Testing Principles

### 2.1 Test-Driven Development
- Write tests before implementing features
- Follow the Red-Green-Refactor cycle
- Test both happy paths and edge cases
- Mock external dependencies

### 2.2 Test Coverage
- Maintain test coverage above 80% for critical code paths
- Test all public interfaces
- Include integration tests for key workflows
- Automate testing in CI pipeline
- Include tests for edge cases and error conditions
- Implement unit tests for all new or modified code

## 3. Version Control Practices

### 3.1 Git Workflow
- Use descriptive branch names
- Make frequent, focused commits
- Write meaningful commit messages
- Follow conventional commit format

### 3.2 Code Review
- Require reviews for all changes
- Focus on logic, security, and maintainability
- Be constructive and specific in feedback
- Address all review comments

## 4. Project Management

### 4.1 Task Tracking
- Update task status regularly
- Follow status indicators: 🔴 Not Started | 🟡 In Progress | 🟢 Completed | ⭕ Blocked | 🔵 In Review
- Prioritize tasks appropriately: 🏃‍♂️ P0 (Critical) | 🏃‍♂️ P1 (High) | 🧍‍♂️ P2 (Medium) | 🪑 P3 (Low)
- Document blockers and dependencies

### 4.2 Communication
- Maintain clear documentation of decisions
- Update relevant team members on significant changes
- Provide context when requesting help
- Document lessons learned

## 5. AI Interaction Guidelines

**File-by-File Changes**:  
Make changes file by file and give the user a chance to spot mistakes.
    
**No Apologies**:  
Never use apologies.
    
**No Understanding Feedback**:  
Avoid giving feedback about understanding in comments or documentation.
    
**No Whitespace Suggestions**:  
Don't suggest whitespace changes.
    
**No Summaries**:  
Do not provide unnecessary summaries of changes made. Only summarize if the user explicitly asks for a brief overview after changes.
    
**No Inventions**:  
Don't invent changes other than what's explicitly requested.
    
**No Unnecessary Confirmations**:  
Don't ask for confirmation of information already provided in the context.
    
**Preserve Existing Code**:  
Don't remove unrelated code or functionalities. Pay attention to preserving existing structures.
    
**Single Chunk Edits**:  
Provide all edits in a single chunk instead of multiple-step instructions or explanations for the same file.
    
**No Implementation Checks**:  
Don't ask the user to verify implementations that are visible in the provided context. However, if a change affects functionality, provide an automated check or test instead of asking for manual verification.
    
**No Unnecessary Updates**:  
Don't suggest updates or changes to files when there are no actual modifications needed.
    
**Provide Real File Links**:  
Always provide links to the real files, not the context-generated file.
    
**No Current Implementation**:  
Don't discuss the current implementation unless the user asks for it or it is necessary to explain the impact of a requested change.
    
**Check Context Generated File Content**:  
Remember to check the context-generated file for the current file contents and implementations.
