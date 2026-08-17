import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();
async function main() {
  const m = await prisma.aiModel.findFirst();
  if (m) {
    const b = Buffer.from("dummy data test test test");
    await prisma.aiModel.update({ where: { id: m.id }, data: { modelData: b } });
    console.log("updated dummy buffer");
  }
}
main();
