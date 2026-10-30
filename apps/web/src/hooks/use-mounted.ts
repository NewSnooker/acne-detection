import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** true เมื่อ render ฝั่ง client แล้ว (ใช้แทน useEffect + setMounted ที่ทำให้ render ซ้ำ) */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
