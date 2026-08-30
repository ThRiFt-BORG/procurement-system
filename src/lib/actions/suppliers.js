'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { emptyToNull } from '@/lib/utils'
import { requireUser } from '@/lib/auth'

function readSupplierForm(formData) {
  return {
    name: formData.get('name')?.toString().trim(),
    contactPerson: emptyToNull(formData.get('contactPerson')),
    phone: emptyToNull(formData.get('phone')),
    email: emptyToNull(formData.get('email')),
    address: emptyToNull(formData.get('address')),
    paymentTerms: emptyToNull(formData.get('paymentTerms')),
    taxPin: emptyToNull(formData.get('taxPin')),
    bankDetails: emptyToNull(formData.get('bankDetails')),
    notes: emptyToNull(formData.get('notes')),
  }
}

export async function createSupplier(formData) {
  await requireUser()
  const data = readSupplierForm(formData)
  if (!data.name) throw new Error('Supplier name is required')

  const existing = await db.supplier.findFirst({ where: { name: { equals: data.name, mode: 'insensitive' } } })
  if (existing) throw new Error(`A supplier named "${existing.name}" already exists`)

  const supplier = await db.supplier.create({ data })
  revalidatePath('/suppliers')
  redirect(`/suppliers/${supplier.id}`)
}

export async function updateSupplier(id, formData) {
  await requireUser()
  const data = readSupplierForm(formData)
  if (!data.name) throw new Error('Supplier name is required')

  const existing = await db.supplier.findFirst({
    where: { name: { equals: data.name, mode: 'insensitive' }, id: { not: id } },
  })
  if (existing) throw new Error(`A supplier named "${existing.name}" already exists`)

  await db.supplier.update({ where: { id }, data })
  revalidatePath('/suppliers')
  revalidatePath(`/suppliers/${id}`)
  redirect(`/suppliers/${id}`)
}

export async function setSupplierActive(id, active) {
  await requireUser()
  await db.supplier.update({ where: { id }, data: { active } })
  revalidatePath('/suppliers')
  revalidatePath(`/suppliers/${id}`)
}

export async function linkSupplierProduct({ supplierId, productId, isPreferred }) {
  await requireUser()
  const existing = await db.supplierProduct.findUnique({
    where: { supplierId_productId: { supplierId, productId } },
  })
  if (existing) return existing

  const created = await db.supplierProduct.create({
    data: { supplierId, productId, isPreferred: Boolean(isPreferred) },
  })
  revalidatePath(`/suppliers/${supplierId}`)
  revalidatePath(`/products/${productId}`)
  return created
}
