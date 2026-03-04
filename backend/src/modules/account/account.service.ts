import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AccountService {
  async verifyToken(token?: string) {
    if (!token) throw new UnauthorizedException('missing_token');
    // TODO: JWT/WX Session 校验 + 黑灰名单标签合并
    return { uid: token.replace('Bearer ', '') };
  }
}
