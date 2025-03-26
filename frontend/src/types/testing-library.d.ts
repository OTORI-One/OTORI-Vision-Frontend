// This file extends Jest's expect with Testing Library's matchers
import '@testing-library/jest-dom';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveTextContent(text: string | RegExp): R;
      toHaveClass(className: string): R;
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeVisible(): R;
      toBeInvalid(): R;
      toBeRequired(): R;
      toHaveAttribute(attr: string, value?: string | RegExp): R;
      toHaveValue(value: string | number | string[]): R;
      toHaveStyle(style: Record<string, any>): R;
      toHaveDisplayValue(value: string | RegExp | Array<string | RegExp>): R;
      toHaveFocus(): R;
      toBeChecked(): R;
      toBeEmpty(): R;
      toBePartiallyChecked(): R;
    }
  }
} 