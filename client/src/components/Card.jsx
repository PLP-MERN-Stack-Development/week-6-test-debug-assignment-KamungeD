// Card.jsx - Reusable card component
import React from 'react';
import PropTypes from 'prop-types';

const Card = ({ 
  children, 
  className = '', 
  shadow = 'md',
  padding = 'md',
  rounded = 'lg',
  onClick,
  hover = false,
  ...props 
}) => {
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  };

  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl'
  };

  const baseClasses = 'bg-white border border-gray-200';
  const hoverClasses = hover ? 'hover:shadow-lg transition-shadow duration-200 cursor-pointer' : '';
  const clickableClasses = onClick ? 'cursor-pointer' : '';

  const classes = [
    baseClasses,
    shadowClasses[shadow],
    paddingClasses[padding],
    roundedClasses[rounded],
    hoverClasses,
    clickableClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={classes}
      onClick={onClick}
      data-testid="card"
      {...props}
    >
      {children}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  shadow: PropTypes.oneOf(['none', 'sm', 'md', 'lg', 'xl']),
  padding: PropTypes.oneOf(['none', 'sm', 'md', 'lg', 'xl']),
  rounded: PropTypes.oneOf(['none', 'sm', 'md', 'lg', 'xl']),
  onClick: PropTypes.func,
  hover: PropTypes.bool
};

export default Card;
