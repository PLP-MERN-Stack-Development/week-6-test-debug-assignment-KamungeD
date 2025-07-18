// PostList.test.jsx - Unit test for PostList component

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import PostList from '../../components/PostList';

// Mock data
const mockPosts = [
  {
    _id: '1',
    title: 'First Post',
    content: 'This is the content of the first post. It should be long enough to test truncation functionality.',
    author: { username: 'john_doe' },
    category: { name: 'Technology' },
    likes: 5,
    views: 25,
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    _id: '2',
    title: 'Second Post',
    content: 'Short content',
    author: { username: 'jane_smith' },
    category: { name: 'Design' },
    likes: 3,
    views: 15,
    createdAt: '2024-01-14T14:20:00Z'
  },
  {
    _id: '3',
    title: 'Third Post',
    content: 'Another post content here',
    author: { username: 'bob_wilson' },
    category: { name: 'Technology' },
    likes: 8,
    views: 40,
    createdAt: '2024-01-13T09:15:00Z'
  }
];

describe('PostList Component', () => {
  // Test rendering with posts
  it('renders posts correctly', () => {
    render(<PostList posts={mockPosts} />);
    
    expect(screen.getByTestId('post-list')).toBeInTheDocument();
    expect(screen.getByTestId('posts-grid')).toBeInTheDocument();
    
    // Check if all posts are rendered
    expect(screen.getByText('First Post')).toBeInTheDocument();
    expect(screen.getByText('Second Post')).toBeInTheDocument();
    expect(screen.getByText('Third Post')).toBeInTheDocument();
  });

  // Test loading state
  it('shows loading spinner when loading', () => {
    render(<PostList posts={[]} loading={true} />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading posts...')).toBeInTheDocument();
  });

  // Test error state
  it('shows error message when error occurs', () => {
    const errorMessage = 'Failed to fetch posts';
    render(<PostList posts={[]} error={errorMessage} />);
    
    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    expect(screen.getByText('Error loading posts')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  // Test empty state
  it('shows empty state when no posts', () => {
    render(<PostList posts={[]} />);
    
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No posts found')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating your first post.')).toBeInTheDocument();
  });

  // Test category filter
  it('renders category filter when multiple categories exist', () => {
    render(<PostList posts={mockPosts} />);
    
    const categoryFilter = screen.getByTestId('category-filter');
    expect(categoryFilter).toBeInTheDocument();
    
    // Should have 'all', 'Technology', and 'Design' categories - use within to be more specific
    expect(screen.getByText('all')).toBeInTheDocument();
    
    // Find Technology button specifically in the filter section
    const techButton = within(categoryFilter).getByText('Technology');
    expect(techButton).toBeInTheDocument();
    
    const designButton = within(categoryFilter).getByText('Design');
    expect(designButton).toBeInTheDocument();
  });

  // Test category filtering
  it('filters posts by category', () => {
    render(<PostList posts={mockPosts} />);
    
    const categoryFilter = screen.getByTestId('category-filter');
    
    // Click on Technology category button specifically
    const techButton = within(categoryFilter).getByText('Technology');
    fireEvent.click(techButton);
    
    // Should show Technology posts (First Post and Third Post)
    expect(screen.getByText('First Post')).toBeInTheDocument();
    expect(screen.getByText('Third Post')).toBeInTheDocument();
    
    // Should NOT show Design post (Second Post) when Technology filter is active
    expect(screen.queryByText('Second Post')).not.toBeInTheDocument();
  });

  // Test post click handler
  it('calls onPostClick when post is clicked', () => {
    const handlePostClick = jest.fn();
    render(<PostList posts={mockPosts} onPostClick={handlePostClick} />);
    
    const firstPostCard = screen.getByTestId('post-card-1');
    fireEvent.click(firstPostCard);
    
    expect(handlePostClick).toHaveBeenCalledWith(mockPosts[0]);
  });

  // Test load more functionality
  it('shows load more button when hasMore is true', () => {
    const handleLoadMore = jest.fn();
    render(<PostList posts={mockPosts} hasMore={true} onLoadMore={handleLoadMore} />);
    
    const loadMoreButton = screen.getByTestId('load-more-button');
    expect(loadMoreButton).toBeInTheDocument();
    expect(loadMoreButton).toHaveTextContent('Load More Posts');
    
    fireEvent.click(loadMoreButton);
    expect(handleLoadMore).toHaveBeenCalled();
  });

  // Test load more button in loading state
  it('shows loading state on load more button', () => {
    render(<PostList posts={mockPosts} hasMore={true} loading={true} />);
    
    const loadMoreButton = screen.getByTestId('load-more-button');
    expect(loadMoreButton).toHaveTextContent('Loading...');
    expect(loadMoreButton).toBeDisabled();
  });

  // Test post metadata rendering
  it('renders post metadata correctly', () => {
    render(<PostList posts={mockPosts} />);
    
    // Check author
    expect(screen.getByText('by john_doe')).toBeInTheDocument();
    expect(screen.getByText('by jane_smith')).toBeInTheDocument();
    
    // Check category badges - use getAllByText since they appear multiple times
    const techBadges = screen.getAllByText('Technology');
    expect(techBadges.length).toBeGreaterThan(0);
    
    const designBadges = screen.getAllByText('Design');
    expect(designBadges.length).toBeGreaterThan(0);
    
    // Check likes and views
    expect(screen.getByText('5')).toBeInTheDocument(); // likes for first post
    expect(screen.getByText('25')).toBeInTheDocument(); // views for first post
  });

  // Test content truncation
  it('truncates long content', () => {
    const longPost = {
      ...mockPosts[0],
      content: 'This is a very long content that should be truncated because it exceeds the maximum length limit that we have set for the content display in the post list component.'
    };
    
    render(<PostList posts={[longPost]} />);
    
    const content = screen.getByText(/This is a very long content/);
    expect(content.textContent).toContain('...');
  });

  // Test custom className
  it('applies custom className', () => {
    render(<PostList posts={mockPosts} className="custom-list-class" />);
    
    const postList = screen.getByTestId('post-list');
    expect(postList).toHaveClass('custom-list-class');
  });

  // Test posts without categories
  it('handles posts without categories', () => {
    const postsWithoutCategories = [
      {
        ...mockPosts[0],
        category: null
      }
    ];
    
    render(<PostList posts={postsWithoutCategories} />);
    
    // Should not show category filter
    expect(screen.queryByTestId('category-filter')).not.toBeInTheDocument();
  });

  // Test posts without author
  it('handles posts without author', () => {
    const postsWithoutAuthor = [
      {
        ...mockPosts[0],
        author: null
      }
    ];
    
    render(<PostList posts={postsWithoutAuthor} />);
    
    expect(screen.getByText('by Anonymous')).toBeInTheDocument();
  });

  // Test date formatting
  it('formats dates correctly', () => {
    render(<PostList posts={mockPosts} />);
    
    // Check if date is formatted (looking for month names) - use getAllByText for multiple matches
    const januaryDates = screen.getAllByText(/January/);
    expect(januaryDates.length).toBeGreaterThan(0);
  });
});
