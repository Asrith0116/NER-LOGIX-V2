import crypto from 'node:crypto';
import type { UserRole } from '../../src/types/index.ts';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization: string;
  vehicleId?: string;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  organization: string;
  vehicleId?: string;
  iat: number;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'ner-logix-resilio-hackathon-secret-key-2026';

export const DEMO_USERS: Record<string, { user: AuthUser; passwordHash: string }> = {
  'driver@nerlogix.in': {
    user: {
      id: 'usr-driver-01',
      email: 'driver@nerlogix.in',
      name: 'Biren Gogoi',
      role: 'driver',
      organization: 'Assam State Freight Operations',
      vehicleId: 'AS-01-J-4422',
    },
    // Simple hashed demo passwords
    passwordHash: 'driver123',
  },
  'dispatcher@nerlogix.in': {
    user: {
      id: 'usr-dispatch-01',
      email: 'dispatcher@nerlogix.in',
      name: 'Ankita Sharma',
      role: 'dispatcher',
      organization: 'NER Regional Logistics Command Center',
    },
    passwordHash: 'dispatch123',
  },
  'sdma@nerlogix.in': {
    user: {
      id: 'usr-sdma-01',
      email: 'sdma@nerlogix.in',
      name: 'Ranjit Sharma',
      role: 'sdma',
      organization: 'State Disaster Management Authority (NE Division)',
    },
    passwordHash: 'sdma123',
  },
  'contractor@nerlogix.in': {
    user: {
      id: 'usr-contractor-01',
      email: 'contractor@nerlogix.in',
      name: 'Lalthanga Khawlhring',
      role: 'contractor',
      organization: 'North East Emergency Logistics Contractor',
    },
    passwordHash: 'contractor123',
  },
};

export class AuthService {
  /**
   * Helper to encode Base64Url string according to RFC 7515.
   */
  private base64UrlEncode(input: string | Buffer): string {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf-8');
    return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  /**
   * Helper to decode Base64Url string.
   */
  private base64UrlDecode(input: string): string {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  /**
   * Issues a signed HMAC-SHA256 JWT session token.
   */
  public createToken(user: AuthUser, expiresInSeconds = 86400): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload: AuthTokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organization: user.organization,
      vehicleId: user.vehicleId,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(unsignedToken)
      .digest();
    const encodedSignature = this.base64UrlEncode(signature);

    return `${unsignedToken}.${encodedSignature}`;
  }

  /**
   * Validates token signature and expiration, returning user payload if valid.
   */
  public verifyToken(token: string): AuthTokenPayload | null {
    if (!token || typeof token !== 'string') return null;
    const parts = token.trim().split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = this.base64UrlEncode(
      crypto.createHmac('sha256', JWT_SECRET).update(unsignedToken).digest()
    );

    // Constant time signature comparison
    const sigA = Buffer.from(encodedSignature);
    const sigB = Buffer.from(expectedSignature);
    if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
      return null;
    }

    try {
      const payload: AuthTokenPayload = JSON.parse(this.base64UrlDecode(encodedPayload));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return null; // Expired token
      }
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Authenticates demo user credentials or quick role selection.
   */
  public authenticate(emailOrRole: string, password?: string): { token: string; user: AuthUser } | null {
    const key = emailOrRole.toLowerCase().trim();

    // Check by email
    let matched = DEMO_USERS[key];

    // Check by role shortcut (e.g., 'driver', 'sdma', 'dispatcher', 'contractor')
    if (!matched) {
      const roleMap: Record<string, string> = {
        driver: 'driver@nerlogix.in',
        dispatcher: 'dispatcher@nerlogix.in',
        sdma: 'sdma@nerlogix.in',
        contractor: 'contractor@nerlogix.in',
      };
      if (roleMap[key]) {
        matched = DEMO_USERS[roleMap[key]];
      }
    }

    if (!matched) return null;

    // Validate password if provided
    if (password && matched.passwordHash && password !== matched.passwordHash) {
      return null;
    }

    const token = this.createToken(matched.user);
    return { token, user: matched.user };
  }
}

export const authService = new AuthService();
