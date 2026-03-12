export interface RoomUICallbacks {
  onReady: () => void;
  onAction: (action: 'CHI' | 'PENG' | 'GANG' | 'HU' | 'PASS') => void;
  onChat: (text: string) => void;
  onEmoji: (emojiId: string) => void;
}

export class RoomUI {
  constructor(private readonly cbs: RoomUICallbacks) {}

  bind() {
    // TODO: 按钮事件绑定
  }

  setReconnectTip(visible: boolean) {
    // TODO: UI 提示 “网络重连中...”
    void visible;
  }

  setOperateButtons(ops: Array<'CHI' | 'PENG' | 'GANG' | 'HU' | 'PASS'>) {
    void ops;
  }
}
