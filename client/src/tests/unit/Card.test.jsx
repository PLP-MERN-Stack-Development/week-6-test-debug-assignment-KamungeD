// Card.test.jsx - Unit test for Card component

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Card from '../../components/Card';

describe('Card Component', () => {
  // Test rendering
  it('renders with children', () => {
    render(
      <Card>
        <h1>Test Card</h1>
        <p>Card content</p>
      </Card>
    );
    
    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  // Test default classes
  it('renders with default classes', () => {
    render(<Card>Default Card</Card>);
    const card = screen.getByTestId('card');
    
    expect(card).toHaveClass('bg-white', 'border', 'border-gray-200');
    expect(card).toHaveClass('shadow-md'); // default shadow
    expect(card).toHaveClass('p-4'); // default padding
    expect(card).toHaveClass('rounded-lg'); // default rounded
  });

  // Test different shadows
  it('renders with different shadow variants', () => {
    const { rerender } = render(<Card shadow="none">No Shadow</Card>);
    let card = screen.getByTestId('card');
    expect(card).not.toHaveClass('shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl');
    
    rerender(<Card shadow="sm">Small Shadow</Card>);
    card = screen.getByTestId('card');
    expect(card).toHaveClass('shadow-sm');
    
    rerender(<Card shadow="lg">Large Shadow</Card>);
    card = screen.getByTestId('card');
    expect(card).toHaveClass('shadow-lg');
    
    rerender(<Card shadow="xl">Extra Large Shadow</Card>);
    card = screen.getByTestId('card');
    expect(card).toHaveClass('shadow-xl');
  });

  // Test different padding
  it('renders with different padding variants', () => {
    const { rerender } = render(<Card padding="none">No Padding</Card>);
    let card = screen.getByTestId('card');
    expect(card).not.toHaveClass('p-3', 'p-4', 'p-6', 'p-8');
    
    rerender(<Card padding="sm">Small Padding</Card>);
    card = screen.getByTestId('card');
    expect(card).toHaveClass('p-3');
    
    rerender(<Card padding="lg">Large Padding</Card>);
    card = screen.getByTestId('card');
    expect(card).toHaveClass('p-6');
    
    rerender(<Card padding="xl">Extra Large Padding</Card>);
    card = screen.getByTestId('card');
    expect(card).toHaveClass('p-8');
  });

  // Test different rounded corners
  it('renders with different rounded variants', () => {
    const { rerender } = render(<Card rounded="none">No Rounded</Card>);
    let card = screen.getByTestId('card');
    expect(card).not.toHaveClass('rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl');
    
    rerender(<Card rounded="sm">Small Rounded</Card>);
    card = screen.getByTestId('card');
    expect(card).toHaveClass('rounded-sm');
    
    rerender(<Card rounded="xl">Extra Large Rounded</Card>);
    card = screen.getByTestId('card');
    expect(card).toHaveClass('rounded-xl');
  });

  // Test hover effect
  it('applies hover classes when hover prop is true', () => {
    render(<Card hover>Hover Card</Card>);
    const card = screen.getByTestId('card');
    
    expect(card).toHaveClass('hover:shadow-lg', 'transition-shadow', 'duration-200', 'cursor-pointer');
  });

  // Test click handler
  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Card onClick={handleClick}>Clickable Card</Card>);
    const card = screen.getByTestId('card');
    
    expect(card).toHaveClass('cursor-pointer');
    
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // Test custom className
  it('applies custom className', () => {
    render(<Card className="custom-card-class">Custom Card</Card>);
    const card = screen.getByTestId('card');
    
    expect(card).toHaveClass('custom-card-class');
  });

  // Test additional props
  it('passes through additional props', () => {
    render(<Card data-custom="test-value" aria-label="Test Card">Props Card</Card>);
    const card = screen.getByTestId('card');
    
    expect(card).toHaveAttribute('data-custom', 'test-value');
    expect(card).toHaveAttribute('aria-label', 'Test Card');
  });

  // Test combined classes
  it('combines all classes correctly', () => {
    render(
      <Card 
        shadow="xl" 
        padding="lg" 
        rounded="md" 
        hover 
        className="custom-class"
        onClick={() => {}}
      >
        Combined Card
      </Card>
    );
    const card = screen.getByTestId('card');
    
    expect(card).toHaveClass(
      'bg-white', 'border', 'border-gray-200',
      'shadow-xl', 'p-6', 'rounded-md',
      'hover:shadow-lg', 'transition-shadow', 'duration-200',
      'cursor-pointer', 'custom-class'
    );
  });
});
