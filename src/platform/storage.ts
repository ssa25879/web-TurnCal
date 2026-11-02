/** 브라우저 저장소. 호출자가 실패를 Promise 거부로 받도록 동기 예외(용량 초과·차단)도 비동기로 전달한다. */
export const Storage = {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  },
};

/** 브라우저가 저장소를 임의로 비우지 않도록 요청한다. 거절돼도 앱 동작에는 영향이 없다. */
export function requestPersistentStorage(): void {
  void navigator.storage?.persist?.().catch(() => {});
}
