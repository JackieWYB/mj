Component({
  data: { roomNo: '' },
  methods: {
    onInput(e) { this.setData({ roomNo: e.detail.value }); },
    onJoin() { this.triggerEvent('join', { roomNo: this.data.roomNo }); },
  },
});
