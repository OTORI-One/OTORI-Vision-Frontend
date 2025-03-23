## 1. React and Next.js

### **1.1. Code Structure & Component Design**

1. **Use Functional Components and Hooks:**
    - Always prefer functional components over class-based components.
    - Use React hooks (e.g., `useState`, `useEffect`, `useContext`) for state management and side effects.
2. **Keep Components Small & Reusable:**
    - Split large components into smaller, reusable components.
    - Follow the Single Responsibility Principle (SRP) where each component does one thing well.
3. **Folder Structure and File Organization:**
    - Organize components under a `/components` directory.
    - Separate pages (Next.js pages) in `/pages`.
    - Group related files (styles, tests, and sub-components) together.

### **1.2. Styling and Presentation**

1. **Consistent Styling:**
    - Use CSS modules, styled-jsx, or a CSS-in-JS library (e.g., styled-components) to encapsulate styles.
2. **Responsive Design:**
    - Ensure components are responsive and accessible across devices.

### **1.3. Error Handling & Logging**

1. **Error Boundaries:**
    - Wrap high-level components in error boundaries to catch rendering errors.
2. **Detailed Inline Logging:**
    - Use `console.error` and `console.warn` for logging errors and warnings during development.
    - Remove or minimize logging in production or use a logging service.
3. **Validation of Props:**
    - Use PropTypes (or TypeScript for static typing) to validate component properties.
    - Provide default props where applicable.

### **1.4. Best Practices for Next.js API Routes**

1. **Method and Input Validation:**
    - Validate HTTP methods (only allow POST, GET, etc. where applicable).
    - Check request payloads rigorously and return clear error messages.
2. **Environment Variables:**
    - Access configuration and secret keys using `process.env` and ensure they are not exposed in client bundles.
3. **Async/Await with Try/Catch:**
    - Always wrap asynchronous logic in `try/catch` blocks for error handling.
    - Log errors in API routes using `console.error` and return appropriate HTTP status codes.

### **1.5. Documentation & Comments**

1. **Inline Comments and JSDoc:**
    - Comment complex logic with inline comments.
    - Use JSDoc for functions and components to explain parameters, return values, and behavior.
2. **Readable Code:**
    - Use descriptive variable and function names.
    - Keep functions short and focused.

---

## 2. Node / JavaScript (Backend & Integration Modules)

### **2.1. Code Organization and Style**

1. **Modular Code:**
    - Separate logic into small, manageable modules (e.g., a dedicated `sparkEngineClient.js`).
    - Use ES6 module syntax (`import`/`export`) consistently.
2. **Consistent Formatting:**
    - Use ESLint with a well-defined style guide (e.g., Airbnb or StandardJS) and Prettier for code formatting.
    - Enforce these rules in your CI/CD pipeline.

### **2.2. Asynchronous Programming & Error Handling**

1. **Async/Await:**
    - Use async/await instead of promise chaining for clarity.
2. **Comprehensive Try/Catch Blocks:**
    - Wrap asynchronous calls in try/catch blocks.
    - Clean up any resources (e.g., event listeners) in the catch/finally blocks.
3. **Input Validation:**
    - Validate all incoming data (e.g., API requests) to prevent malformed input.
    - Consider using a validation library like Joi or express-validator.
4. **Event Handling:**
    - When subscribing to events (e.g., in the SparkEngine client), always provide cleanup logic (unsubscribe) to prevent memory leaks.

### **2.3. Logging and Comments**

1. **Detailed Logging:**
    - Log each significant action (e.g., API calls, responses) with context.
    - Include timestamps and request IDs where possible.
2. **Inline Documentation:**
    - Document functions and modules with clear comments.
    - Explain why a particular implementation choice was made if it isn’t self-evident.

---

## 3. Python (For any auxiliary scripts or services)

### **3.1. Coding Style**

1. **PEP8 Compliance:**
    - Follow PEP8 style guidelines for naming conventions, spacing, and formatting.
    - Use tools like `flake8` or `pylint` to enforce these standards.
2. **Type Annotations:**
    - Use type hints (available in Python 3.6+) to clarify function parameters and return types.
    - This aids in static analysis and readability.

### **3.2. Documentation and Comments**

1. **Docstrings:**
    - Use triple-quoted docstrings for modules, classes, and functions.
    - Document parameters, return values, and side effects.
2. **Readable Code:**
    - Keep functions short and focused on one task.
    - Use meaningful variable names and consistent naming conventions.

### **3.3. Error Handling & Logging**

1. **Exception Handling:**
    - Use try/except blocks around code that might fail.
    - Avoid catching broad exceptions unless necessary; prefer specific exception types.
2. **Logging Module:**
    - Use Python’s built-in `logging` module to log errors, warnings, and info messages.
    - Configure logging with different levels (DEBUG, INFO, WARNING, ERROR, CRITICAL).

### **3.4. Testing**

1. **Unit Testing:**
    - Write tests using frameworks such as `pytest` or `unittest`.
    - Include tests for edge cases and error conditions.
2. **Continuous Integration:**
    - Integrate tests into your CI/CD pipeline to ensure code quality.

---

## 4. General Best Practices Across All Languages

### **4.1. Version Control and CI/CD**

1. **Use Git:**
    - Commit code often with clear, descriptive commit messages.
2. **Continuous Integration:**
    - Set up CI pipelines (using GitHub Actions, GitLab CI, etc.) to run tests and lint checks automatically.
3. **Code Reviews:**
    - Use peer reviews or automated code reviews (with AI-assisted tools) to catch issues early.

### **4.2. Security Best Practices**

1. **Environment Variables:**
    - Never hard-code secrets; always use environment variables.
2. **Input Sanitization:**
    - Sanitize and validate user inputs to prevent injection attacks.
3. **Dependency Management:**
    - Keep dependencies up to date and use tools (like `npm audit` or `safety` for Python) to scan for vulnerabilities.

### **4.3. Testing and Quality Assurance**

1. **Test-Driven Development (TDD):**
   - Write tests before implementing features
   - Follow the Red-Green-Refactor cycle:
     - Red: Write a failing test for the desired functionality
     - Green: Write minimal code to make the test pass
     - Refactor: Clean up the code while keeping tests passing
   - Test both happy paths and edge cases
   - Mock external dependencies for unit tests
   - Use snapshot testing for UI components when appropriate
   - Maintain test coverage above 80% for critical code paths

2. **Unit and Integration Tests:**
    - Write tests for each module and integration point.
    - Prefer small, focused unit tests over large integration tests when possible
    - Use descriptive test names that explain the expected behavior

3. **Automated Linting and Formatting:**
    - Enforce code style guidelines with automated tools.

4. **Monitoring and Logging in Production:**
    - Use production monitoring and error-tracking tools (e.g., Sentry) to capture runtime issues.

### **4.4. Documentation and Knowledge Sharing**

1. **Inline Comments and README Files:**
    - Document how each module works and any non-obvious implementation details.
2. **API Documentation:**
    - If exposing APIs, use tools like Swagger or Postman to document them.

### 4.5. Project Workflow and Collaboration

1. **Implementation Plans:**
   - Follow structured implementation plans for feature development
   - Update implementation plans with progress summaries after completing each step
   - Track completion status with clear markers (e.g., "Done")

2. **Incremental Changes:**
   - Make changes file-by-file to allow for easier review
   - Submit small, cohesive pull requests rather than large, sweeping changes

3. **Code Quality Safeguards:**
   - Avoid magic numbers; replace hardcoded values with named constants to improve code clarity and maintainability
   - Use assertions to validate assumptions and catch potential errors early
   - Consider and handle all edge cases in implementations
   - Ensure all changes maintain compatibility with project-specified language versions
   - Take a security-first approach when suggesting or implementing changes

### 4.6. Project Documentation and Knowledge Base

1. **Project Rules Folder:**
   - Each project should have a `/rules` folder containing project-specific documentation
   - Always consult the project's rules folder before making significant changes
   - Follow the hierarchy specified in each project's general rules file

2. **Documentation Types:**
   - Project requirements document: Defines project objectives and scope
   - Technical documentation: Includes architecture, stack, and structure documentation
   - Implementation guidance: Contains workflow and implementation plans
   - Project rules: Contains project-specific coding standards and practices

3. **Documentation First Approach:**
   - Before implementing features, consult relevant documentation in project's rules folder
   - If documentation is missing or outdated, recommend updates before proceeding
   - Follow project-specific documentation over global guidance when conflicts exist

---

## 5. Implementation Examples (Summary)

### **React/Next.js (Frontend Component)**

- Use functional components with hooks.
- Validate inputs and catch API errors.
- Log key events (sending a message, receiving a response).

```jsx
// Example: pages/index.js
import { useState } from 'react';

/**
 * Chat component using React hooks.
 * Displays chat messages and handles API calls.
 */
export default function Chat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);

  async function sendMessage() {
    if (!input.trim()) {
      console.warn('Empty input; message not sent.');
      return;
    }

    const userMessage = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');

    try {
      console.log('Sending message:', currentInput);
      const response = await fetch('/api/inference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentInput }),
      });
      const data = await response.json();
      if (data.result) {
        setMessages((prev) => [...prev, { sender: 'agent', text: data.result }]);
      } else {
        console.error('Error from API:', data.error);
        setMessages((prev) => [...prev, { sender: 'agent', text: 'Error: ' + data.error }]);
      }
    } catch (err) {
      console.error('Network error:', err);
      setMessages((prev) => [...prev, { sender: 'agent', text: 'Error connecting to API.' }]);
    }
  }

  return (
    <div>
      {/* Chat UI Markup */}
    </div>
  );
}
```

### **Node/JavaScript (Backend API)**

- Validate method and inputs.
- Use try/catch for async operations.
- Log details and return appropriate status codes.

```javascript
// Example: pages/api/inference.js
import { sendInference } from '../../sparkEngineClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  const { message } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Invalid message input.' });
  }
  try {
    const result = await sendInference(message);
    return res.status(200).json({ result });
  } catch (error) {
    console.error('Inference error:', error);
    return res.status(500).json({ error: 'Inference error' });
  }
}
```

### **Python (Auxiliary Scripts)**

- Follow PEP8, use type hints, log errors.
- Write tests using `pytest`.

```python
# Example: a simple utility module in Python
import logging
from typing import Any

logging.basicConfig(level=logging.DEBUG)

def process_data(data: Any) -> str:
    """
    Process input data and return a result string.
    
    Args:
        data (Any): Input data to be processed.
    
    Returns:
        str: Processed result.
    
    Raises:
        ValueError: If input data is not valid.
    """
    if not data:
        logging.error("No data provided.")
        raise ValueError("Invalid input data")
    result = str(data).upper()  # Sample processing
    logging.info("Data processed successfully.")
    return result
```

---

## 6. How to Use These Rules with AI Tools

When integrating these guidelines into an AI-assisted development workflow, you can:

- **Linting/Static Analysis:**  
    Configure ESLint, Prettier, and Flake8/pylint to enforce these guidelines automatically.
    
- **Code Generation Prompts:**  
    When prompting an AI code assistant (like ChatGPT or Codex), instruct it to “follow our best practices for React/Next.js/Node/Python as described” and mention key points like error handling, logging, and proper documentation.
    
- **Code Reviews:**  
    Create a checklist (or even integrate with tools like GitHub Actions) that verifies if the submitted code follows these rules before merging into the main branch.
    
- **Documentation:**  
    Maintain a living document (such as this one) in your repository so every team member—and any AI assistant you might use—can reference it.
    
