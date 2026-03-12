export type UIPage = 'ROOM' | 'SETTINGS' | 'CHAT' | 'SETTLEMENT';

export class UIRouter {
  open(page: UIPage, params?: Record<string, unknown>) {
    void params;
    // TODO: 控制节点显示隐藏 + 动画切换
    console.log('[UIRouter] open', page);
  }

  close(page: UIPage) {
    console.log('[UIRouter] close', page);
  }
}
