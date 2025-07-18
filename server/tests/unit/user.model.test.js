// user.model.test.js - Unit tests for User model

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../src/models/User');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('User Model', () => {
  const validUserData = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
  };

  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      expect(savedUser._id).toBeDefined();
      expect(savedUser.username).toBe(validUserData.username);
      expect(savedUser.email).toBe(validUserData.email);
      expect(savedUser.firstName).toBe(validUserData.firstName);
      expect(savedUser.lastName).toBe(validUserData.lastName);
      expect(savedUser.role).toBe('user'); // default role
      expect(savedUser.isActive).toBe(true); // default value
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should hash password before saving', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      // Password should be hashed, not plain text
      expect(savedUser.password).not.toBe(validUserData.password);
      expect(savedUser.password).toBeTruthy();
      expect(savedUser.password.length).toBeGreaterThan(20); // Hashed passwords are longer
    });

    it('should not include password in JSON output by default', async () => {
      const user = new User(validUserData);
      const savedUser = await user.save();
      
      // Find user without selecting password
      const foundUser = await User.findById(savedUser._id);
      expect(foundUser.password).toBeUndefined();
      
      // toPublicJSON should not include password
      const publicData = foundUser.toPublicJSON();
      expect(publicData.password).toBeUndefined();
    });

    it('should create user with admin role when specified', async () => {
      const adminUserData = {
        ...validUserData,
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
      };
      
      const user = new User(adminUserData);
      const savedUser = await user.save();
      
      expect(savedUser.role).toBe('admin');
    });
  });

  describe('User Validation', () => {
    it('should require username', async () => {
      const userData = { ...validUserData };
      delete userData.username;
      
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/username.*required/i);
    });

    it('should require email', async () => {
      const userData = { ...validUserData };
      delete userData.email;
      
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/email.*required/i);
    });

    it('should require password', async () => {
      const userData = { ...validUserData };
      delete userData.password;
      
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/password.*required/i);
    });

    it('should validate email format', async () => {
      const userData = {
        ...validUserData,
        email: 'invalid-email',
      };
      
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/valid email/i);
    });

    it('should enforce minimum username length', async () => {
      const userData = {
        ...validUserData,
        username: 'ab', // Too short
      };
      
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/at least 3 characters/i);
    });

    it('should enforce maximum username length', async () => {
      const userData = {
        ...validUserData,
        username: 'a'.repeat(31), // Too long
      };
      
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/cannot exceed 30 characters/i);
    });

    it('should enforce minimum password length', async () => {
      const userData = {
        ...validUserData,
        password: '12345', // Too short
      };
      
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/at least 6 characters/i);
    });

    it('should enforce unique username', async () => {
      // Create first user
      const user1 = new User(validUserData);
      await user1.save();
      
      // Try to create second user with same username
      const userData2 = {
        ...validUserData,
        email: 'different@example.com',
      };
      const user2 = new User(userData2);
      
      await expect(user2.save()).rejects.toThrow(/duplicate key/i);
    });

    it('should enforce unique email', async () => {
      // Create first user
      const user1 = new User(validUserData);
      await user1.save();
      
      // Try to create second user with same email
      const userData2 = {
        ...validUserData,
        username: 'differentuser',
      };
      const user2 = new User(userData2);
      
      await expect(user2.save()).rejects.toThrow(/duplicate key/i);
    });

    it('should validate role values', async () => {
      const userData = {
        ...validUserData,
        username: 'roletest',
        email: 'roletest@example.com',
        role: 'invalid-role',
      };
      
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow(/enum/i);
    });
  });

  describe('User Methods', () => {
    let user;
    
    beforeEach(async () => {
      user = new User(validUserData);
      await user.save();
    });

    describe('comparePassword', () => {
      it('should return true for correct password', async () => {
        const isMatch = await user.comparePassword(validUserData.password);
        expect(isMatch).toBe(true);
      });

      it('should return false for incorrect password', async () => {
        const isMatch = await user.comparePassword('wrongpassword');
        expect(isMatch).toBe(false);
      });

      it('should handle empty password', async () => {
        const isMatch = await user.comparePassword('');
        expect(isMatch).toBe(false);
      });
    });

    describe('toPublicJSON', () => {
      it('should return user data without password', () => {
        const publicData = user.toPublicJSON();
        
        expect(publicData).toHaveProperty('_id');
        expect(publicData).toHaveProperty('username');
        expect(publicData).toHaveProperty('email');
        expect(publicData).toHaveProperty('firstName');
        expect(publicData).toHaveProperty('lastName');
        expect(publicData).toHaveProperty('role');
        expect(publicData).toHaveProperty('isActive');
        expect(publicData).toHaveProperty('createdAt');
        expect(publicData).toHaveProperty('updatedAt');
        expect(publicData).not.toHaveProperty('password');
      });

      it('should include virtual fields', () => {
        const publicData = user.toPublicJSON();
        
        expect(publicData).toHaveProperty('fullName');
        expect(publicData.fullName).toBe(`${user.firstName} ${user.lastName}`);
      });
    });

    describe('fullName virtual', () => {
      it('should return full name when both first and last names are provided', () => {
        expect(user.fullName).toBe(`${user.firstName} ${user.lastName}`);
      });

      it('should return username when names are not provided', async () => {
        const userWithoutNames = new User({
          username: 'nonames',
          email: 'nonames@example.com',
          password: 'password123',
        });
        await userWithoutNames.save();
        
        expect(userWithoutNames.fullName).toBe(userWithoutNames.username);
      });

      it('should return username when only first name is provided', async () => {
        const userWithFirstName = new User({
          username: 'firstname',
          email: 'firstname@example.com',
          password: 'password123',
          firstName: 'First',
        });
        await userWithFirstName.save();
        
        expect(userWithFirstName.fullName).toBe(userWithFirstName.username);
      });
    });
  });

  describe('User Indexing', () => {
    it('should have index on email field', async () => {
      const indexes = await User.collection.getIndexes();
      const emailIndex = Object.keys(indexes).find(key => key.includes('email'));
      
      expect(emailIndex).toBeTruthy();
    });

    it('should have index on username field', async () => {
      const indexes = await User.collection.getIndexes();
      const usernameIndex = Object.keys(indexes).find(key => key.includes('username'));
      
      expect(usernameIndex).toBeTruthy();
    });
  });

  describe('User Updates', () => {
    it('should not rehash password if password is not modified', async () => {
      const user = new User(validUserData);
      await user.save();
      const originalPassword = user.password;
      
      // Update a different field
      user.firstName = 'Updated';
      await user.save();
      
      expect(user.password).toBe(originalPassword);
    });

    it('should rehash password if password is modified', async () => {
      const user = new User(validUserData);
      await user.save();
      const originalPassword = user.password;
      
      // Update password
      user.password = 'newpassword123';
      await user.save();
      
      expect(user.password).not.toBe(originalPassword);
      expect(user.password).not.toBe('newpassword123'); // Should be hashed
    });
  });
});
