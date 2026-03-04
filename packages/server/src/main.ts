import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';

dotenv.config({ path: process.env.ENV_FILE || '.env' });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new WsAdapter(app));
  const port = Number(process.env.SERVER_PORT || 3000);
  await app.listen(port);
  console.log(`[server] listening http://localhost:${port}`);
}

bootstrap();
