// Button.test.jsx - Unit test for Button component

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button from '../../components/Button';

describe('Button Component', () => {
  // Test rendering
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-blue-600'); // primary variant
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('type', 'button');
  });

  // Test different variants
  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    let button = screen.getByRole('button', { name: /primary/i });
    expect(button).toHaveClass('bg-blue-600');
    
    rerender(<Button variant="secondary">Secondary</Button>);
    button = screen.getByRole('button', { name: /secondary/i });
    expect(button).toHaveClass('bg-gray-200');
    
    rerender(<Button variant="danger">Danger</Button>);
    button = screen.getByRole('button', { name: /danger/i });
    expect(button).toHaveClass('bg-red-600');
    
    rerender(<Button variant="outline">Outline</Button>);
    button = screen.getByRole('button', { name: /outline/i });
    expect(button).toHaveClass('border');
  });

  // Test different sizes
  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="small">Small</Button>);
    let button = screen.getByRole('button', { name: /small/i });
    expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
    
    rerender(<Button size="medium">Medium</Button>);
    button = screen.getByRole('button', { name: /medium/i });
    expect(button).toHaveClass('px-4', 'py-2', 'text-sm');
    
    rerender(<Button size="large">Large</Button>);
    button = screen.getByRole('button', { name: /large/i });
    expect(button).toHaveClass('px-6', 'py-3', 'text-base');
  });

  // Test disabled state
  it('renders disabled button correctly', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button', { name: /disabled button/i });
    
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  // Test loading state
  it('renders loading button correctly', () => {
    render(<Button loading>Loading Button</Button>);
    const button = screen.getByRole('button', { name: /loading button/i });
    const spinner = screen.getByTestId('loading-spinner');
    
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(spinner).toBeInTheDocument();
  });

  // Test click handler
  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // Test click handler not called when disabled
  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  // Test click handler not called when loading
  it('does not call onClick when loading', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} loading>Loading</Button>);
    const button = screen.getByRole('button', { name: /loading/i });
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  // Test custom className
  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button', { name: /custom/i });
    
    expect(button).toHaveClass('custom-class');
  });

  // Test different button types
  it('renders with different types', () => {
    const { rerender } = render(<Button type="submit">Submit</Button>);
    let button = screen.getByRole('button', { name: /submit/i });
    expect(button).toHaveAttribute('type', 'submit');
    
    rerender(<Button type="reset">Reset</Button>);
    button = screen.getByRole('button', { name: /reset/i });
    expect(button).toHaveAttribute('type', 'reset');
  });

  // Test accessibility
  it('has proper accessibility attributes', () => {
    render(<Button>Accessible Button</Button>);
    const button = screen.getByRole('button', { name: /accessible button/i });
    
    expect(button).toHaveAttribute('data-testid', 'button');
    expect(button).toHaveClass('focus:outline-none', 'focus:ring-2');
  });

  // Test that loading state takes precedence over disabled
  it('loading state overrides disabled state', () => {
    render(<Button disabled={false} loading>Loading</Button>);
    const button = screen.getByRole('button', { name: /loading/i });
    
    expect(button).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
