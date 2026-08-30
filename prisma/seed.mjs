// Demo / seed data — synthetic sample records so the app has something real
// to click through. Not sourced supplier data; replace via the UI once real
// suppliers, products and prices are entered.

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { splitPrice, calcLineTotals, calcLpoTotals } from '../src/lib/money.js'
import { hashPassword } from '../src/lib/password.js'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter })

const VAT_RATE = 16

function monthsAgo(n) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d
}

async function addPriceHistory(supplierProductId, points) {
  for (const point of points) {
    const { priceExclVat, vatAmount, priceInclVat } = splitPrice(
      point.price,
      VAT_RATE,
      point.vatStatus === 'EXEMPT' ? 'EXCLUSIVE' : 'EXCLUSIVE',
      point.vatStatus
    )
    await db.priceHistory.create({
      data: {
        supplierProductId,
        vatBasis: 'EXCLUSIVE',
        quotedPrice: point.price,
        vatRate: point.vatStatus === 'EXEMPT' ? 0 : VAT_RATE,
        priceExclVat,
        vatAmount,
        priceInclVat,
        effectiveDate: point.date,
        sourceReference: point.source ?? 'Supplier price list',
      },
    })
  }
}

async function main() {
  console.log('Clearing existing data...')
  await db.creditNote.deleteMany()
  await db.deliveryItem.deleteMany()
  await db.delivery.deleteMany()
  await db.lPOItem.deleteMany()
  await db.lPO.deleteMany()
  await db.priceHistory.deleteMany()
  await db.supplierProduct.deleteMany()
  await db.product.deleteMany()
  await db.category.deleteMany()
  await db.supplier.deleteMany()
  await db.session.deleteMany()
  await db.user.deleteMany()

  console.log('Creating users...')
  const officer = await db.user.create({
    data: {
      name: 'Amina Wanjiru',
      email: 'amina@example-restaurant.co.ke',
      role: 'PROCUREMENT_OFFICER',
      passwordHash: await hashPassword('officer123'),
    },
  })
  const manager = await db.user.create({
    data: {
      name: 'David Otieno',
      email: 'david@example-restaurant.co.ke',
      role: 'MANAGER',
      passwordHash: await hashPassword('manager123'),
    },
  })
  await db.user.create({
    data: {
      name: 'Grace Kariuki',
      email: 'grace@example-restaurant.co.ke',
      role: 'ADMIN',
      passwordHash: await hashPassword('admin123'),
    },
  })
  await db.user.create({
    data: {
      name: 'Joseph Kimani',
      email: 'joseph@example-restaurant.co.ke',
      role: 'VIEWER',
      passwordHash: await hashPassword('viewer123'),
    },
  })

  console.log('Creating categories...')
  const categoryNames = [
    'Vegetables',
    'Alcoholic Beverages',
    'Dry Goods',
    'Cleaning Materials',
    'Packaging Materials',
    'Bakery & Pastry Ingredients',
    'Beverages',
  ]
  const categories = {}
  for (const name of categoryNames) {
    categories[name] = await db.category.create({ data: { name } })
  }

  console.log('Creating suppliers...')
  const supplierDefs = [
    { name: 'Fresh Fields Produce Ltd', contactPerson: 'Grace Muthoni', phone: '+254 712 345 001', email: 'sales@freshfields.co.ke', paymentTerms: 'Net 7 days', taxPin: 'P051234567A' },
    { name: 'Green Valley Farms', contactPerson: 'Peter Kamau', phone: '+254 712 345 002', email: 'orders@greenvalley.co.ke', paymentTerms: 'Cash on delivery', taxPin: 'P051234568B' },
    { name: 'Nairobi Bottlers Distributors', contactPerson: 'Susan Achieng', phone: '+254 712 345 003', email: 'accounts@nairobibottlers.co.ke', paymentTerms: 'Net 30 days', taxPin: 'P051234569C' },
    { name: 'Metro Wholesale Dry Goods', contactPerson: 'James Mwangi', phone: '+254 712 345 004', email: 'james@metrowholesale.co.ke', paymentTerms: 'Net 14 days', taxPin: 'P051234570D' },
    { name: 'Highland Bakery Ingredients', contactPerson: 'Faith Chebet', phone: '+254 712 345 005', email: 'faith@highlandbakery.co.ke', paymentTerms: 'Net 14 days', taxPin: 'P051234571E' },
    { name: 'CleanPro Supplies Co.', contactPerson: 'Brian Odhiambo', phone: '+254 712 345 006', email: 'brian@cleanpro.co.ke', paymentTerms: 'Net 30 days', taxPin: 'P051234572F' },
    { name: 'Dairy Fresh Kenya', contactPerson: 'Mary Njeri', phone: '+254 712 345 007', email: 'mary@dairyfresh.co.ke', paymentTerms: 'Cash on delivery', taxPin: 'P051234573G' },
  ]
  const suppliers = {}
  for (const def of supplierDefs) {
    suppliers[def.name] = await db.supplier.create({ data: def })
  }

  console.log('Creating products...')
  const productDefs = [
    { name: 'Tomatoes', unit: 'kg', category: 'Vegetables', vatStatus: 'EXEMPT' },
    { name: 'Potatoes', unit: 'kg', category: 'Vegetables', vatStatus: 'EXEMPT' },
    { name: 'Onions', unit: 'kg', category: 'Vegetables', vatStatus: 'EXEMPT' },
    { name: 'Whisky (Johnnie Walker Black Label)', unit: 'bottle', category: 'Alcoholic Beverages', vatStatus: 'APPLICABLE' },
    { name: 'Tusker Lager', unit: 'crate', category: 'Alcoholic Beverages', vatStatus: 'APPLICABLE' },
    { name: 'Rice', unit: 'kg', category: 'Dry Goods', vatStatus: 'APPLICABLE' },
    { name: 'Sugar', unit: 'carton', category: 'Dry Goods', vatStatus: 'APPLICABLE' },
    { name: 'Flour', unit: '25kg bag', category: 'Bakery & Pastry Ingredients', vatStatus: 'APPLICABLE' },
    { name: 'Baking Powder', unit: 'kg', category: 'Bakery & Pastry Ingredients', vatStatus: 'APPLICABLE' },
    { name: 'Dishwashing Liquid', unit: 'litre', category: 'Cleaning Materials', vatStatus: 'APPLICABLE' },
    { name: 'Bleach', unit: 'litre', category: 'Cleaning Materials', vatStatus: 'APPLICABLE' },
    { name: 'Takeaway Boxes (Medium)', unit: 'piece', category: 'Packaging Materials', vatStatus: 'APPLICABLE' },
    { name: 'Cling Film Roll', unit: 'roll', category: 'Packaging Materials', vatStatus: 'APPLICABLE' },
    { name: 'Bottled Water 500ml', unit: 'crate', category: 'Beverages', vatStatus: 'APPLICABLE' },
    { name: 'Fresh Milk', unit: 'litre', category: 'Beverages', vatStatus: 'EXEMPT' },
  ]
  const products = {}
  for (const def of productDefs) {
    products[def.name] = await db.product.create({
      data: {
        name: def.name,
        unit: def.unit,
        vatStatus: def.vatStatus,
        vatRate: def.vatStatus === 'EXEMPT' ? 0 : VAT_RATE,
        categoryId: categories[def.category].id,
      },
    })
  }

  console.log('Linking suppliers to products and building price history...')

  async function link(supplierName, productName, isPreferred, priceSeries) {
    const sp = await db.supplierProduct.create({
      data: {
        supplierId: suppliers[supplierName].id,
        productId: products[productName].id,
        isPreferred,
      },
    })
    await addPriceHistory(sp.id, priceSeries)
    return sp
  }

  const vatStatusOf = (productName) => products[productName].vatStatus

  // Vegetables — two suppliers on Tomatoes/Potatoes for comparison
  const tomatoesA = await link('Fresh Fields Produce Ltd', 'Tomatoes', true, [
    { price: 65, date: monthsAgo(3), vatStatus: 'EXEMPT' },
    { price: 72, date: monthsAgo(1.5), vatStatus: 'EXEMPT' },
    { price: 78, date: monthsAgo(0.2), vatStatus: 'EXEMPT' },
  ])
  await link('Green Valley Farms', 'Tomatoes', false, [
    { price: 70, date: monthsAgo(3), vatStatus: 'EXEMPT' },
    { price: 70, date: monthsAgo(1.5), vatStatus: 'EXEMPT' },
    { price: 74, date: monthsAgo(0.2), vatStatus: 'EXEMPT' },
  ])
  const potatoesA = await link('Fresh Fields Produce Ltd', 'Potatoes', true, [
    { price: 48, date: monthsAgo(3), vatStatus: 'EXEMPT' },
    { price: 52, date: monthsAgo(1.5), vatStatus: 'EXEMPT' },
    { price: 50, date: monthsAgo(0.2), vatStatus: 'EXEMPT' },
  ])
  await link('Green Valley Farms', 'Potatoes', false, [
    { price: 51, date: monthsAgo(1.5), vatStatus: 'EXEMPT' },
    { price: 55, date: monthsAgo(0.2), vatStatus: 'EXEMPT' },
  ])
  await link('Fresh Fields Produce Ltd', 'Onions', true, [
    { price: 90, date: monthsAgo(2), vatStatus: 'EXEMPT' },
    { price: 96, date: monthsAgo(0.2), vatStatus: 'EXEMPT' },
  ])

  // Alcoholic beverages / beverages
  const whisky = await link('Nairobi Bottlers Distributors', 'Whisky (Johnnie Walker Black Label)', true, [
    { price: 3200, date: monthsAgo(3), vatStatus: 'APPLICABLE' },
    { price: 3200, date: monthsAgo(1.5), vatStatus: 'APPLICABLE' },
    { price: 3450, date: monthsAgo(0.2), vatStatus: 'APPLICABLE' },
  ])
  await link('Nairobi Bottlers Distributors', 'Tusker Lager', true, [
    { price: 2800, date: monthsAgo(2), vatStatus: 'APPLICABLE' },
    { price: 2850, date: monthsAgo(0.2), vatStatus: 'APPLICABLE' },
  ])
  await link('Nairobi Bottlers Distributors', 'Bottled Water 500ml', true, [
    { price: 480, date: monthsAgo(2), vatStatus: 'APPLICABLE' },
    { price: 480, date: monthsAgo(0.2), vatStatus: 'APPLICABLE' },
  ])
  await link('Dairy Fresh Kenya', 'Fresh Milk', true, [
    { price: 62, date: monthsAgo(2), vatStatus: 'EXEMPT' },
    { price: 65, date: monthsAgo(0.2), vatStatus: 'EXEMPT' },
  ])

  // Dry goods / bakery — Sugar carried by two suppliers
  const rice = await link('Metro Wholesale Dry Goods', 'Rice', true, [
    { price: 5000, date: monthsAgo(3), vatStatus: 'APPLICABLE' },
    { price: 5200, date: monthsAgo(1.5), vatStatus: 'APPLICABLE' },
    { price: 5500, date: monthsAgo(0.2), vatStatus: 'APPLICABLE' },
  ])
  const sugarA = await link('Metro Wholesale Dry Goods', 'Sugar', true, [
    { price: 5500, date: monthsAgo(2), vatStatus: 'APPLICABLE' },
    { price: 5700, date: monthsAgo(0.2), vatStatus: 'APPLICABLE' },
  ])
  await link('Highland Bakery Ingredients', 'Sugar', false, [
    { price: 5300, date: monthsAgo(2), vatStatus: 'APPLICABLE' },
    { price: 5100, date: monthsAgo(0.2), vatStatus: 'APPLICABLE' },
  ])
  const flour = await link('Highland Bakery Ingredients', 'Flour', true, [
    { price: 2400, date: monthsAgo(3), vatStatus: 'APPLICABLE' },
    { price: 2550, date: monthsAgo(0.2), vatStatus: 'APPLICABLE' },
  ])
  await link('Highland Bakery Ingredients', 'Baking Powder', true, [
    { price: 320, date: monthsAgo(2), vatStatus: 'APPLICABLE' },
    { price: 340, date: monthsAgo(0.2), vatStatus: 'APPLICABLE' },
  ])

  // Cleaning / packaging
  const dishLiquid = await link('CleanPro Supplies Co.', 'Dishwashing Liquid', true, [
    { price: 380, date: monthsAgo(2), vatStatus: 'APPLICABLE' },
    { price: 410, date: monthsAgo(0.2), vatStatus: 'APPLICABLE' },
  ])
  await link('CleanPro Supplies Co.', 'Bleach', true, [
    { price: 250, date: monthsAgo(2), vatStatus: 'APPLICABLE' },
    { price: 260, date: monthsAgo(0.2), vatStatus: 'APPLICABLE' },
  ])
  await link('CleanPro Supplies Co.', 'Takeaway Boxes (Medium)', true, [
    { price: 18, date: monthsAgo(2), vatStatus: 'APPLICABLE' },
    { price: 19.5, date: monthsAgo(0.2), vatStatus: 'APPLICABLE' },
  ])
  await link('CleanPro Supplies Co.', 'Cling Film Roll', true, [
    { price: 650, date: monthsAgo(2), vatStatus: 'APPLICABLE' },
    { price: 650, date: monthsAgo(0.2), vatStatus: 'APPLICABLE' },
  ])

  console.log('Creating sample LPOs...')

  async function latestPrice(supplierProductId) {
    return db.priceHistory.findFirst({
      where: { supplierProductId },
      orderBy: { effectiveDate: 'desc' },
    })
  }

  async function createLpo({ supplierName, seq, status, orderDate, lines, approved }) {
    const lpoNumber = `LPO-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`
    const itemsData = []
    for (const line of lines) {
      const price = await latestPrice(line.supplierProductId)
      const product = Object.values(products).find((p) => p.id === line.productId)
      const totals = calcLineTotals(line.quantity, price.priceExclVat, VAT_RATE, product.vatStatus)
      itemsData.push({
        productId: product.id,
        priceHistoryId: price.id,
        quantity: line.quantity,
        unit: product.unit,
        unitPrice: price.priceExclVat,
        vatStatus: product.vatStatus,
        vatRate: product.vatStatus === 'EXEMPT' ? 0 : VAT_RATE,
        ...totals,
      })
    }
    const { subtotal, vatTotal, grandTotal } = calcLpoTotals(itemsData)

    return db.lPO.create({
      data: {
        lpoNumber,
        supplierId: suppliers[supplierName].id,
        status,
        orderDate,
        preparedById: officer.id,
        approvedById: approved ? manager.id : null,
        subtotal,
        vatTotal,
        grandTotal,
        notes: 'Weekly standing order',
        terms: 'Delivery within 48 hours. Goods subject to inspection on arrival.',
        items: { create: itemsData },
      },
    })
  }

  await createLpo({
    supplierName: 'Fresh Fields Produce Ltd',
    seq: 1,
    status: 'FULLY_RECEIVED',
    orderDate: monthsAgo(1.2),
    approved: true,
    lines: [
      { supplierProductId: tomatoesA.id, productId: products['Tomatoes'].id, quantity: 40 },
      { supplierProductId: potatoesA.id, productId: products['Potatoes'].id, quantity: 30 },
    ],
  })

  const metroLpo = await createLpo({
    supplierName: 'Metro Wholesale Dry Goods',
    seq: 2,
    status: 'APPROVED',
    orderDate: monthsAgo(0.3),
    approved: true,
    lines: [
      { supplierProductId: rice.id, productId: products['Rice'].id, quantity: 20 },
      { supplierProductId: sugarA.id, productId: products['Sugar'].id, quantity: 10 },
    ],
  })

  await createLpo({
    supplierName: 'Nairobi Bottlers Distributors',
    seq: 3,
    status: 'PENDING_APPROVAL',
    orderDate: monthsAgo(0.05),
    approved: false,
    lines: [{ supplierProductId: whisky.id, productId: products['Whisky (Johnnie Walker Black Label)'].id, quantity: 12 }],
  })

  await createLpo({
    supplierName: 'CleanPro Supplies Co.',
    seq: 4,
    status: 'DRAFT',
    orderDate: new Date(),
    approved: false,
    lines: [{ supplierProductId: dishLiquid.id, productId: products['Dishwashing Liquid'].id, quantity: 24 }],
  })

  await createLpo({
    supplierName: 'Highland Bakery Ingredients',
    seq: 5,
    status: 'FULLY_RECEIVED',
    orderDate: monthsAgo(2),
    approved: true,
    lines: [{ supplierProductId: flour.id, productId: products['Flour'].id, quantity: 15 }],
  })

  console.log('Recording a sample delivery with a shortfall...')

  const metroItems = await db.lPOItem.findMany({ where: { lpoId: metroLpo.id } })
  const riceItem = metroItems.find((i) => i.productId === products['Rice'].id)
  const sugarItem = metroItems.find((i) => i.productId === products['Sugar'].id)

  const delivery = await db.delivery.create({
    data: {
      lpoId: metroLpo.id,
      deliveryDate: monthsAgo(0.1),
      status: 'PARTIALLY_RECEIVED',
      notes: 'Sugar arrived two cartons short — driver said the rest is coming next trip.',
      items: {
        create: [
          { lpoItemId: riceItem.id, orderedQty: riceItem.quantity, deliveredQty: riceItem.quantity },
          { lpoItemId: sugarItem.id, orderedQty: sugarItem.quantity, deliveredQty: Number(sugarItem.quantity) - 2 },
        ],
      },
    },
    include: { items: true },
  })

  await db.lPO.update({ where: { id: metroLpo.id }, data: { status: 'PARTIALLY_RECEIVED' } })

  const sugarDeliveryItem = delivery.items.find((i) => i.lpoItemId === sugarItem.id)
  const sugarUnitInclVat = Number(sugarItem.lineTotal) / Number(sugarItem.quantity)

  await db.creditNote.create({
    data: {
      deliveryItemId: sugarDeliveryItem.id,
      amount: Math.round(2 * sugarUnitInclVat * 100) / 100,
      status: 'PENDING',
      notes: 'Awaiting credit note from Metro Wholesale for the 2 missing cartons.',
    },
  })

  console.log('Seed complete.')
  console.log('Login as officer: amina@example-restaurant.co.ke / officer123')
  console.log('Login as manager: david@example-restaurant.co.ke / manager123')
  console.log('Login as admin:   grace@example-restaurant.co.ke / admin123')
  console.log('Login as viewer:  joseph@example-restaurant.co.ke / viewer123')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
