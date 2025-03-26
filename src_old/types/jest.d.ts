/// <reference types="jest" />

declare namespace jest {
  interface Matchers<R> {
    toBeInTheDocument(): R;
    toBeVisible(): R;
    toBeDisabled(): R;
    toHaveClass(className: string): R;
    toHaveTextContent(text: string): R;
    toHaveValue(value: string | number | string[]): R;
  }
} 