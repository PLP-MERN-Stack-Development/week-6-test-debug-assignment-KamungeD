// PostList.jsx - Component for displaying a list of blog posts
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Card from './Card';
import Button from './Button';

const PostList = ({ 
  posts = [], 
  loading = false, 
  error = null,
  onPostClick,
  onLoadMore,
  hasMore = false,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Get unique categories from posts
  const categories = ['all', ...new Set(posts.map(post => post.category?.name).filter(Boolean))];

  // Filter posts by selected category
  const filteredPosts = selectedCategory === 'all' 
    ? posts 
    : posts.filter(post => post.category?.name === selectedCategory);

  // Format date helper
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Truncate content helper
  const truncateContent = (content, maxLength = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading && posts.length === 0) {
    return (
      <div className="flex justify-center items-center py-12" data-testid="loading-spinner">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading posts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12" data-testid="error-message">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium">Error loading posts</h3>
          <p className="text-sm text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12" data-testid="empty-state">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">No posts found</h3>
          <p className="text-sm text-gray-600 mt-2">Get started by creating your first post.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`} data-testid="post-list">
      {/* Category Filter */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2" data-testid="category-filter">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'primary' : 'outline'}
              size="small"
              onClick={() => setSelectedCategory(category)}
              className="capitalize"
            >
              {category}
            </Button>
          ))}
        </div>
      )}

      {/* Posts Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="posts-grid">
        {filteredPosts.map(post => (
          <Card
            key={post._id}
            hover
            onClick={() => onPostClick && onPostClick(post)}
            className="h-full flex flex-col"
            data-testid={`post-card-${post._id}`}
          >
            {/* Post Header */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                {post.category && (
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    {post.category.name}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {formatDate(post.createdAt)}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 hover:text-blue-600 transition-colors">
                {post.title}
              </h3>
            </div>

            {/* Post Content */}
            <div className="flex-grow mb-4">
              <p className="text-gray-600 text-sm line-clamp-3">
                {truncateContent(post.content)}
              </p>
            </div>

            {/* Post Footer */}
            <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {post.likes || 0}
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {post.views || 0}
                </span>
              </div>
              <span>
                by {post.author?.username || 'Anonymous'}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center pt-6">
          <Button
            onClick={onLoadMore}
            loading={loading}
            variant="outline"
            data-testid="load-more-button"
          >
            {loading ? 'Loading...' : 'Load More Posts'}
          </Button>
        </div>
      )}
    </div>
  );
};

PostList.propTypes = {
  posts: PropTypes.arrayOf(PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    author: PropTypes.shape({
      username: PropTypes.string
    }),
    category: PropTypes.shape({
      name: PropTypes.string
    }),
    likes: PropTypes.number,
    views: PropTypes.number,
    createdAt: PropTypes.string.isRequired
  })),
  loading: PropTypes.bool,
  error: PropTypes.string,
  onPostClick: PropTypes.func,
  onLoadMore: PropTypes.func,
  hasMore: PropTypes.bool,
  className: PropTypes.string
};

export default PostList;
