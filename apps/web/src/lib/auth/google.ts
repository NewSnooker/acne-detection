/**
 * เปิดใช้การเข้าสู่ระบบด้วย Google ได้ก็ต่อเมื่อตั้งค่า env ครบทั้งสองตัว
 * (เป็นฟังก์ชันเพื่อให้อ่านค่า env ตอนรันจริง ไม่ใช่ตอน build)
 */
export function isGoogleEnabled(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}
