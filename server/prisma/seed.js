import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding VERTEX database with official catalog...");

  // 1. Seed Categories
  const electronicsCategory = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: {},
    create: {
      name: "Electronics",
      slug: "electronics",
      icon: "🔌",
      tint: "tint-blue",
      description: "Microcontrollers, Motor Drives, PLC, Development Boards",
    },
  });

  const fastenersCategory = await prisma.category.upsert({
    where: { slug: "fasteners" },
    update: {},
    create: {
      name: "Screws & Fasteners",
      slug: "fasteners",
      icon: "🔩",
      tint: "tint-orange",
      description: "Flat, Phillips, Hex, Torx, Bolts, Washers, Brass Inserts",
    },
  });

  const nutsCategory = await prisma.category.upsert({
    where: { slug: "nuts" },
    update: {},
    create: {
      name: "Nut Types",
      slug: "nuts",
      icon: "⬡",
      tint: "tint-green",
      description: "Hex, Nyloc, Flanged Nyloc, Wing, Dome, Flange Nuts",
    },
  });

  console.log("Categories seeded successfully.");

  // 2. Product 1: Arduino Uno R3
  await prisma.product.upsert({
    where: { slug: "arduino-uno-r3" },
    update: {},
    create: {
      name: "Arduino Uno R3 Microcontroller Board",
      slug: "arduino-uno-r3",
      description: "ATmega328P based microcontroller board for electronics and prototyping.",
      categoryId: electronicsCategory.id,
      brand: "Arduino",
      hsnCode: "8542",
      gstRate: 18.00,
      tag: "Best Seller",
      variants: {
        create: [
          {
            sku: "ELEC-ARD-UNO-R3",
            partNumber: "A000066",
            name: "Standard Unit",
            packSize: "1 Unit",
            price: 1299.00,
            stockQuantity: 50,
          },
        ],
      },
    },
  });

  // 3. Product 2: Motor Driver Module (L298N)
  await prisma.product.upsert({
    where: { slug: "motor-driver-module-l298n" },
    update: {},
    create: {
      name: "Motor Driver Module (L298N)",
      slug: "motor-driver-module-l298n",
      description: "Dual H-Bridge motor driver module for DC and stepper motors.",
      categoryId: electronicsCategory.id,
      brand: "Generic",
      hsnCode: "8542",
      gstRate: 18.00,
      tag: "10% OFF",
      variants: {
        create: [
          {
            sku: "ELEC-DRV-L298N",
            partNumber: "L298N",
            name: "Standard Unit",
            packSize: "1 Unit",
            price: 499.00,
            mrp: 550.00,
            stockQuantity: 75,
          },
        ],
      },
    },
  });

  // 4. Product 3: PLC - Delta DVP Series
  await prisma.product.upsert({
    where: { slug: "plc-delta-dvp-series" },
    update: {},
    create: {
      name: "PLC - Delta DVP Series",
      slug: "plc-delta-dvp-series",
      description: "High performance industrial programmable logic controller.",
      categoryId: electronicsCategory.id,
      brand: "Delta",
      hsnCode: "8537",
      gstRate: 18.00,
      variants: {
        create: [
          {
            sku: "ELEC-PLC-DELTA-DVP",
            partNumber: "DVP-14SS2",
            name: "Standard Unit",
            packSize: "1 Unit",
            price: 4999.00,
            stockQuantity: 20,
          },
        ],
      },
    },
  });

  // 5. Product 4: Raspberry Pi 4 Development Board
  await prisma.product.upsert({
    where: { slug: "raspberry-pi-4-development-board" },
    update: {},
    create: {
      name: "Raspberry Pi 4 Development Board",
      slug: "raspberry-pi-4-development-board",
      description: "Quad core 64-bit single board computer with 4GB RAM.",
      categoryId: electronicsCategory.id,
      brand: "Raspberry Pi",
      hsnCode: "8471",
      gstRate: 18.00,
      variants: {
        create: [
          {
            sku: "ELEC-DEV-RPI-4B",
            partNumber: "RPI4-MODBP-4GB",
            name: "4GB RAM Unit",
            packSize: "1 Unit",
            price: 3599.00,
            stockQuantity: 35,
          },
        ],
      },
    },
  });

  // 6. Product 5: Stainless Steel Hex Bolt (M8 x 30mm) with Pack-of-10 and Tiered Pricing
  const hexBoltProduct = await prisma.product.upsert({
    where: { slug: "ss-hex-bolt-m8-30" },
    update: {},
    create: {
      name: "Stainless Steel Hex Bolt (M8 x 30mm)",
      slug: "ss-hex-bolt-m8-30",
      description: "Precision-machined SS304 corrosion-resistant hex head bolts.",
      categoryId: fastenersCategory.id,
      brand: "VERTEX",
      hsnCode: "7318",
      gstRate: 18.00,
      variants: {
        create: [
          {
            sku: "FAST-HEX-M8-30-P10",
            partNumber: "SS304-HEX-M8-30",
            name: "M8 x 30mm - Pack of 10",
            packSize: "Pack of 10",
            dimensions: "M8 x 30mm",
            price: 250.00,
            stockQuantity: 200,
            tieredPrices: {
              create: [
                { minQuantity: 1, maxQuantity: 9, unitPrice: 250.00 },
                { minQuantity: 10, maxQuantity: 49, unitPrice: 220.00 },
                { minQuantity: 50, maxQuantity: null, unitPrice: 190.00 },
              ],
            },
          },
        ],
      },
    },
  });

  // 7. Product 6: Nyloc Nut (M8) with Pack-of-20 and Tiered Pricing
  await prisma.product.upsert({
    where: { slug: "nyloc-nut-m8" },
    update: {},
    create: {
      name: "Nyloc Nut (M8)",
      slug: "nyloc-nut-m8",
      description: "Nylon insert lock nuts for vibration-resistant engineering assemblies.",
      categoryId: nutsCategory.id,
      brand: "VERTEX",
      hsnCode: "7318",
      gstRate: 18.00,
      variants: {
        create: [
          {
            sku: "NUTS-NYL-M8-P20",
            partNumber: "SS304-NYL-M8",
            name: "M8 - Pack of 20",
            packSize: "Pack of 20",
            dimensions: "M8",
            price: 120.00,
            stockQuantity: 150,
            tieredPrices: {
              create: [
                { minQuantity: 1, maxQuantity: 9, unitPrice: 120.00 },
                { minQuantity: 10, maxQuantity: 49, unitPrice: 105.00 },
                { minQuantity: 50, maxQuantity: null, unitPrice: 90.00 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log("6 Sample catalog products with variants and tiered pricing seeded successfully.");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
