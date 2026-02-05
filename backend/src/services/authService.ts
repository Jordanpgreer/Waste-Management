import { pool } from '../config/database';
import { User, UserRole, AuthToken } from '../types';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';

export interface RegisterInput {
  orgId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
  orgId?: string;
}

export class AuthService {
  async register(input: RegisterInput): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthToken }> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existingUser = await client.query(
        'SELECT id FROM users WHERE org_id = $1 AND email = $2 AND deleted_at IS NULL',
        [input.orgId, input.email]
      );

      if (existingUser.rows.length > 0) {
        throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
      }

      const hashedPassword = await hashPassword(input.password);

      const result = await client.query(
        `INSERT INTO users (org_id, email, password_hash, first_name, last_name, phone, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, org_id, email, first_name, last_name, phone, role, client_id, is_active, email_verified,
                   created_at, updated_at`,
        [
          input.orgId,
          input.email.toLowerCase(),
          hashedPassword,
          input.firstName,
          input.lastName,
          input.phone,
          input.role || UserRole.CLIENT_USER,
        ]
      );

      const user = result.rows[0];

      await client.query('COMMIT');

      const accessToken = generateAccessToken({
        userId: user.id,
        orgId: user.org_id,
        email: user.email,
        role: user.role,
        clientId: user.client_id,
      });

      const refreshToken = generateRefreshToken({
        userId: user.id,
        orgId: user.org_id,
        email: user.email,
        role: user.role,
        clientId: user.client_id,
      });

      return {
        user,
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: 604800,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async login(input: LoginInput): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthToken }> {
    let query = 'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL';
    const params: any[] = [input.email.toLowerCase()];

    if (input.orgId) {
      query += ' AND org_id = $2';
      params.push(input.orgId);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new AppError('Account is inactive', 403, 'ACCOUNT_INACTIVE');
    }

    const isPasswordValid = await comparePassword(input.password, user.password_hash);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    const accessToken = generateAccessToken({
      userId: user.id,
      orgId: user.org_id,
      email: user.email,
      role: user.role,
      clientId: user.client_id,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      orgId: user.org_id,
      email: user.email,
      role: user.role,
      clientId: user.client_id,
    });

    const { password_hash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: 604800,
      },
    };
  }

  async getUserById(userId: string, orgId: string): Promise<Omit<User, 'password_hash'> | null> {
    const result = await pool.query(
      `SELECT id, org_id, email, first_name, last_name, phone, role, client_id, is_active,
              email_verified, last_login_at, created_at, updated_at
       FROM users
       WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
      [userId, orgId]
    );

    return result.rows[0] || null;
  }

  async changePassword(
    userId: string,
    orgId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL',
      [userId, orgId]
    );

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const isPasswordValid = await comparePassword(currentPassword, result.rows[0].password_hash);

    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
    }

    const hashedPassword = await hashPassword(newPassword);

    await pool.query(
      'UPDATE users SET password_hash = $1, password_changed_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );
  }
}

export const authService = new AuthService();
