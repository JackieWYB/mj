export class UILogPanel {
  private lines: string[] = [];

  log(text: string) {
    this.lines.push(`[${new Date().toLocaleTimeString()}] ${text}`);
    // Cocos 中可绑定到 RichText / Label
    console.log(this.lines[this.lines.length - 1]);
  }

  getAll() {
    return [...this.lines];
  }
}
