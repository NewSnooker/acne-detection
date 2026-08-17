import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const models = await prisma.aiModel.findMany({
    select: { id: true, name: true, sizeMb: true, modelData: true }
  });
  console.log(models.map(m => ({ id: m.id, size: m.sizeMb, byteLength: m.modelData?.length })));
}
main();
