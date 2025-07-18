// posts.test.js - Integration tests for posts API endpoints

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const Post = require('../../src/models/Post');
const User = require('../../src/models/User');
const Category = require('../../src/models/Category');
const { generateToken } = require('../../src/utils/auth');

let mongoServer;
let token;
let adminToken;
let userId;
let adminUserId;
let postId;
let categoryId;

// Setup in-memory MongoDB server before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create a test category
  const category = await Category.create({
    name: 'Test Category',
    description: 'A test category for posts',
  });
  categoryId = category._id;

  // Create a regular test user
  const user = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
  });
  userId = user._id;
  token = generateToken(user);

  // Create an admin test user
  const adminUser = await User.create({
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
  });
  adminUserId = adminUser._id;
  adminToken = generateToken(adminUser);

  // Create a test post
  const post = await Post.create({
    title: 'Test Post for Integration Testing',
    content: 'This is a comprehensive test post content for integration testing',
    author: userId,
    category: categoryId,
    status: 'published',
  });
  postId = post._id;
});

// Clean up after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clean up database between tests (except the setup data)
afterEach(async () => {
  // Keep the test user, admin, category, and initial post, but clean up any other created data
  await Post.deleteMany({ 
    _id: { $ne: postId }
  });
});

describe('POST /api/posts', () => {
  it('should create a new post when authenticated', async () => {
    const postData = {
      title: 'New Test Post for Creation',
      content: 'This is the content of the new test post for creation',
      category: categoryId,
      status: 'draft',
      tags: ['test', 'integration'],
    };

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send(postData);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Post created successfully');
    expect(res.body.post).toBeDefined();
    expect(res.body.post.title).toBe(postData.title);
    expect(res.body.post.content).toBe(postData.content);
    expect(res.body.post.author.username).toBe('testuser');
    expect(res.body.post.status).toBe('draft');
  });

  it('should return 401 when not authenticated', async () => {
    const postData = {
      title: 'Unauthorized Post',
      content: 'This post should not be created',
      category: categoryId,
    };

    const res = await request(app)
      .post('/api/posts')
      .send(postData);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Access denied');
  });

  it('should return 400 for invalid post data', async () => {
    const postData = {
      title: 'Bad', // Too short
      content: 'Short', // Too short
      category: 'invalid-id', // Invalid category ID
    };

    const res = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send(postData);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });
});

describe('GET /api/posts', () => {
  it('should return all published posts', async () => {
    const res = await request(app).get('/api/posts');

    expect(res.status).toBe(200);
    expect(res.body.posts).toBeDefined();
    expect(Array.isArray(res.body.posts)).toBeTruthy();
    expect(res.body.posts.length).toBeGreaterThan(0);
    expect(res.body.pagination).toBeDefined();
  });

  it('should filter posts by category', async () => {
    await Post.create({
      title: 'Filtered Post by Category',
      content: 'This post should be filtered by category',
      author: userId,
      category: categoryId,
      status: 'published',
    });

    const res = await request(app)
      .get(`/api/posts?category=${categoryId}`);

    expect(res.status).toBe(200);
    expect(res.body.posts).toBeDefined();
    expect(Array.isArray(res.body.posts)).toBeTruthy();
    expect(res.body.posts.length).toBeGreaterThan(0);
  });

  it('should paginate results correctly', async () => {
    const posts = [];
    for (let i = 0; i < 15; i++) {
      posts.push({
        title: `Pagination Test Post ${i}`,
        content: `Content for pagination test post ${i}`,
        author: userId,
        category: categoryId,
        status: 'published',
      });
    }
    await Post.insertMany(posts);

    const page1 = await request(app)
      .get('/api/posts?page=1&limit=10');
    
    const page2 = await request(app)
      .get('/api/posts?page=2&limit=10');

    expect(page1.status).toBe(200);
    expect(page2.status).toBe(200);
    expect(page1.body.posts.length).toBe(10);
    expect(page2.body.posts.length).toBeGreaterThan(0);
  });
});

describe('GET /api/posts/:id', () => {
  it('should return a post by ID', async () => {
    const res = await request(app)
      .get(`/api/posts/${postId}`);

    expect(res.status).toBe(200);
    expect(res.body.post).toBeDefined();
    expect(res.body.post._id).toBe(postId.toString());
  });

  it('should return 404 for non-existent post', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    
    const res = await request(app)
      .get(`/api/posts/${nonExistentId}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Post not found');
  });
});

describe('PUT /api/posts/:id', () => {
  it('should update a post by the author', async () => {
    const updateData = {
      title: 'Updated Test Post Title',
      content: 'This is the updated content of the test post',
    };

    const res = await request(app)
      .put(`/api/posts/${postId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(updateData);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Post updated successfully');
    expect(res.body.post.title).toBe(updateData.title);
    expect(res.body.post.content).toBe(updateData.content);
  });

  it('should return 401 when not authenticated', async () => {
    const updateData = {
      title: 'Unauthorized Update',
    };

    const res = await request(app)
      .put(`/api/posts/${postId}`)
      .send(updateData);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Access denied');
  });
});

describe('DELETE /api/posts/:id', () => {
  it('should delete a post by the author', async () => {
    const postToDelete = await Post.create({
      title: 'Post to be Deleted',
      content: 'This post will be deleted in the test',
      author: userId,
      category: categoryId,
      status: 'draft',
    });

    const res = await request(app)
      .delete(`/api/posts/${postToDelete._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Post deleted successfully');

    const deletedPost = await Post.findById(postToDelete._id);
    expect(deletedPost).toBeNull();
  });
});

describe('POST /api/posts/:id/like', () => {
  it('should like a post when authenticated', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/like`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Post liked');
    expect(res.body.isLiked).toBe(true);
    expect(res.body.likeCount).toBe(1);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app)
      .post(`/api/posts/${postId}/like`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Access denied');
  });
}); 