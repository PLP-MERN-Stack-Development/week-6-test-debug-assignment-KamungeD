const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Category name must be at least 2 characters long'],
    maxlength: [50, 'Category name cannot exceed 50 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
  },
  slug: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
  },
  color: {
    type: String,
    match: [/^#([0-9A-F]{3}){1,2}$/i, 'Please enter a valid hex color code'],
    default: '#3B82F6',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for performance
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });

// Generate slug from name before saving
categorySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }
  next();
});

// Virtual for post count (will be populated when needed)
categorySchema.virtual('postCount', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'category',
  count: true,
});

// Ensure virtual fields are serialized
categorySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Category', categorySchema);
