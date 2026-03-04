import { GameClient } from './core/GameClient';
import { UILogPanel } from './ui/UILogPanel';

// 在 Cocos 场景初始化中调用
export function bootstrapDemo() {
  const wsUrl = (globalThis as any).GAME_WS_URL || 'ws://localhost:3000/ws';
  const token = (globalThis as any).GAME_TOKEN || 'mock-U1001';
  const roomId = (globalThis as any).GAME_ROOM_ID || '';

  const ui = new UILogPanel();
  const game = new GameClient(ui, wsUrl, token);
  game.start();
  if (roomId) game.joinRoom(roomId);
  return game;
}
