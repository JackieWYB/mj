import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthService {
  mockLogin(uid?: string) {
    const userId = uid || `U${Date.now()}`;
    return { uid: userId, token: `mock-${userId}` };
  }

  verify(token?: string) {
    if (!token?.startsWith('mock-')) throw new UnauthorizedException('invalid_token');
    return { uid: token.replace('mock-', '') };
  }
}
