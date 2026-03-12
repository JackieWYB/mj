import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login/mock')
  loginMock(@Body() body: { uid?: string }) {
    return this.authService.mockLogin(body?.uid);
  }
}
