// auth.test.js - Unit tests for authentication utilities

const {
  generateToken,
  verifyToken,
  extractToken,
  validatePassword,
  calculatePasswordStrength,
} = require('../../src/utils/auth');
const mongoose = require('mongoose');

describe('Authentication Utilities', () => {
  const mockUser = {
    _id: new mongoose.Types.ObjectId(),
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockUser);
      
      expect(typeof token).toBe('string');
      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include user data in token payload', () => {
      const token = generateToken(mockUser);
      const decoded = verifyToken(token);
      
      expect(decoded.id).toBe(mockUser._id.toString());
      expect(decoded.username).toBe(mockUser.username);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(mockUser);
      const decoded = verifyToken(token);
      
      expect(decoded).toBeTruthy();
      expect(decoded.id).toBe(mockUser._id.toString());
      expect(decoded.username).toBe(mockUser.username);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        verifyToken(invalidToken);
      }).toThrow('Invalid token');
    });

    it('should throw error for malformed token', () => {
      const malformedToken = 'not-a-jwt-token';
      
      expect(() => {
        verifyToken(malformedToken);
      }).toThrow('Invalid token');
    });
  });

  describe('extractToken', () => {
    it('should extract token from Authorization header', () => {
      const token = 'sample-jwt-token';
      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };
      
      const extractedToken = extractToken(req);
      expect(extractedToken).toBe(token);
    });

    it('should return null if no Authorization header', () => {
      const req = {
        headers: {},
      };
      
      const extractedToken = extractToken(req);
      expect(extractedToken).toBeNull();
    });

    it('should return null if Authorization header is malformed', () => {
      const req = {
        headers: {
          authorization: 'InvalidFormat token',
        },
      };
      
      const extractedToken = extractToken(req);
      expect(extractedToken).toBeNull();
    });

    it('should return null if Authorization header is missing Bearer prefix', () => {
      const req = {
        headers: {
          authorization: 'sample-jwt-token',
        },
      };
      
      const extractedToken = extractToken(req);
      expect(extractedToken).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should validate a strong password', () => {
      const password = 'StrongPassword123';
      const result = validatePassword(password);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBeDefined();
    });

    it('should reject password that is too short', () => {
      const password = '12345';
      const result = validatePassword(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 6 characters long');
    });

    it('should reject password without uppercase letters', () => {
      const password = 'password123';
      const result = validatePassword(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase letters', () => {
      const password = 'PASSWORD123';
      const result = validatePassword(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without numbers', () => {
      const password = 'PasswordOnly';
      const result = validatePassword(password);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should validate a minimum requirements password', () => {
      const password = 'Password1';
      const result = validatePassword(password);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('calculatePasswordStrength', () => {
    it('should return "weak" for weak passwords', () => {
      const weakPasswords = ['123456', 'password', 'qwerty'];
      
      weakPasswords.forEach(password => {
        const strength = calculatePasswordStrength(password);
        expect(strength).toBe('weak');
      });
    });

    it('should return "medium" for medium strength passwords', () => {
      const mediumPassword = 'Password123';
      const strength = calculatePasswordStrength(mediumPassword);
      
      expect(['medium', 'strong']).toContain(strength);
    });

    it('should return "strong" for strong passwords', () => {
      const strongPassword = 'StrongPassword123!@#';
      const strength = calculatePasswordStrength(strongPassword);
      
      expect(strength).toBe('strong');
    });

    it('should handle very short passwords', () => {
      const shortPassword = '1';
      const strength = calculatePasswordStrength(shortPassword);
      
      expect(strength).toBe('weak');
    });

    it('should handle empty passwords', () => {
      const emptyPassword = '';
      const strength = calculatePasswordStrength(emptyPassword);
      
      expect(strength).toBe('weak');
    });
  });
});
