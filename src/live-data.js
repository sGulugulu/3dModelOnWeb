/**
 * src/live-data.js — 设备实时数据接入模块
 *
 * 【设计目标】
 *   1. 把「数据从哪里来」与「前端怎么显示」解耦:前端只订阅 deviceId,
 *      收到 { deviceId, value, unit? } 即更新对应点位。
 *   2. 预留真实设备(WebSocket / MQTT)接入骨架,当前测试阶段用固定值 123.456
 *      模拟数据流,验证「标点 -> 传数 -> 即时显示」全链路。
 *
 * 【接入真实数据(以后)】
 *   把下方 startDemo 换成 WebSocket/MQTT 实现即可,无需改动前端展示逻辑。
 *   示例消息格式(均可扩展 unit / label / timestamp):
 *     { "deviceId": 1, "value": 985.12, "unit": "rpm" }
 */

/**
 * 创建实时数据源管理器。
 * @param {object} options
 * @param {(msg: { deviceId: number, value: number, unit?: string }) => void} options.onValue
 *   收到某设备数据时回调,交给前端更新对应点位。
 */
export function createLiveData({ onValue }) {
  const deviceIds = new Set();

  const subscribe = (id) => deviceIds.add(id);
  const unsubscribe = (id) => deviceIds.delete(id);
  const ids = () => deviceIds;

  /**
   * 演示数据源:周期向当前所有已订阅设备推送固定值 123.456。
   * 用于尚未拿到真实设备数据时验证展示效果。
   * @param {number} intervalMs 推送间隔(毫秒)
   * @returns {() => void} 停止函数
   */
  function startDemo(intervalMs = 1500) {
    const timer = setInterval(() => {
      deviceIds.forEach((deviceId) => onValue({ deviceId, value: 123.456 }));
    }, intervalMs);
    return () => clearInterval(timer);
  }

  // ------------------------------------------------------------------
  // 【真实设备数据源骨架 —— 以后按需启用】
  //  WebSocket 方案:
  //    function startWebSocket(url) {
  //      const ws = new WebSocket(url);
  //      ws.onmessage = (ev) => {
  //        try { onValue(JSON.parse(ev.data)); }
  //        catch (_) { /* 忽略非 JSON 消息 */ }
  //      };
  //      ws.onclose = () => { /* 可选:断线重连 */ };
  //      return () => ws.close();
  //    }
  //
  //  MQTT over WebSocket 方案(需 mqtt 库):
  //    订阅主题后,把 payload 解析为 { deviceId, value, unit } 调用 onValue。
  // ------------------------------------------------------------------

  return { subscribe, unsubscribe, ids, startDemo };
}