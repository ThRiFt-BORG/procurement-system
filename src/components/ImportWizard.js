'use client'

import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { commitImport } from '@/lib/actions/imports'
import { locateColumns, scanForPriceAndVat, classifyVat, buildGroups, normalizeKey, titleCase } from '@/lib/importParse'
import { inputClass, labelClass, btnPrimary, btnSecondary, btnGhost } from '@/components/form'

function effectiveVat(row) {
  if (row.vatOverride) return { ok: true, ...row.vatOverride }
  if (row.matchedVatStatus === 'EXEMPT') return { ok: true, status: 'EXEMPT' }
  if (row.matchedVatStatus === 'APPLICABLE') {
    if (row.vat.status === 'APPLICABLE' && row.vat.basis) return { ok: true, status: 'APPLICABLE', basis: row.vat.basis, confident: row.vat.confident }
    return { ok: false }
  }
  if (row.vat.status === 'EXEMPT') return { ok: true, status: 'EXEMPT' }
  if (row.vat.status === 'APPLICABLE' && row.vat.basis) return { ok: true, status: 'APPLICABLE', basis: row.vat.basis, confident: row.vat.confident }
  return { ok: false }
}

function mappingIsValid(m) {
  if (!m) return false
  if (m.action === 'existing') return Boolean(m.id)
  return Boolean(m.newName?.trim())
}

function rowIsValid(row, categoryMapping, supplierMapping) {
  if (!row.productName?.trim()) return false
  if (!(Number(row.price) > 0)) return false
  if (!mappingIsValid(categoryMapping[row.categoryKey])) return false
  if (!mappingIsValid(supplierMapping[row.supplierKey])) return false
  return effectiveVat(row).ok
}

export default function ImportWizard({ categories, suppliers, products, defaultVatRate }) {
  const existingProductByKey = useMemo(() => new Map(products.map((p) => [p.name.trim().toLowerCase(), p])), [products])

  const [step, setStep] = useState('upload')
  const [fileName, setFileName] = useState('')
  const [sheetNames, setSheetNames] = useState([])
  const [selectedSheet, setSelectedSheet] = useState('')
  const [workbook, setWorkbook] = useState(null)
  const [parseError, setParseError] = useState(null)

  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [sourceLabel, setSourceLabel] = useState('')
  const [rows, setRows] = useState([])
  const [categoryGroups, setCategoryGroups] = useState([])
  const [supplierGroups, setSupplierGroups] = useState([])
  const [categoryMapping, setCategoryMapping] = useState({})
  const [supplierMapping, setSupplierMapping] = useState({})
  const [filterMode, setFilterMode] = useState('all')

  const [committing, setCommitting] = useState(false)
  const [commitError, setCommitError] = useState(null)
  const [commitResult, setCommitResult] = useState(null)

  function parseSheet(wb, sheetName) {
    const ws = wb.Sheets[sheetName]
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true })
    const loc = locateColumns(aoa)
    if (!loc) {
      setParseError('Could not find a "Product" column on this sheet — pick a different sheet, or check the file has a header row.')
      setRows([])
      return
    }
    setParseError(null)

    let currentCategory = null
    const parsedRows = []
    let rid = 0
    for (let r = loc.headerRow + 1; r < aoa.length; r++) {
      const row = aoa[r] ?? []
      if (loc.categoryCol !== -1) {
        const catCell = row[loc.categoryCol]
        const catStr = catCell?.toString().trim()
        if (catStr) currentCategory = catStr
      }
      const productName = row[loc.productCol]?.toString().trim()
      if (!productName) continue

      const supplierRaw = loc.supplierCol !== -1 ? row[loc.supplierCol]?.toString().trim() ?? '' : ''
      const scanFrom = (loc.supplierCol !== -1 ? loc.supplierCol : loc.productCol) + 1
      const { price, vatRaw, unitHint } = scanForPriceAndVat(row, scanFrom)
      const vat = classifyVat(vatRaw)
      const existing = existingProductByKey.get(productName.toLowerCase())
      const looksNumeric = unitHint !== null && !Number.isNaN(Number(unitHint))

      parsedRows.push({
        id: rid++,
        category: currentCategory || 'Uncategorized',
        categoryKey: normalizeKey(currentCategory || 'Uncategorized'),
        supplierRaw,
        supplierKey: normalizeKey(supplierRaw),
        productName,
        unit: existing?.unit || (unitHint && !looksNumeric ? unitHint : ''),
        price,
        vatRaw,
        vat,
        vatOverride: null,
        matchedProductId: existing?.id ?? null,
        matchedVatStatus: existing?.vatStatus ?? null,
        matchedVatRate: existing?.vatRate ?? null,
      })
    }

    const catGroups = buildGroups(parsedRows.map((r) => r.category), categories)
    const supGroups = buildGroups(parsedRows.map((r) => r.supplierRaw).filter(Boolean), suppliers)

    const catMap = {}
    for (const g of catGroups) {
      catMap[g.key] = g.exactMatchId ? { action: 'existing', id: g.exactMatchId, label: g.label } : { action: 'new', newName: titleCase(g.label) }
    }
    const supMap = {}
    for (const g of supGroups) {
      supMap[g.key] = g.exactMatchId ? { action: 'existing', id: g.exactMatchId, label: g.label } : { action: 'new', newName: titleCase(g.label) }
    }

    const withInclude = parsedRows.map((r) => ({
      ...r,
      include: Boolean(r.price > 0 && r.supplierRaw && effectiveVat(r).ok),
    }))

    setRows(withInclude)
    setCategoryGroups(catGroups)
    setSupplierGroups(supGroups)
    setCategoryMapping(catMap)
    setSupplierMapping(supMap)
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setSourceLabel(file.name)
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    setWorkbook(wb)
    setSheetNames(wb.SheetNames)
    const first = wb.SheetNames[0]
    setSelectedSheet(first)
    parseSheet(wb, first)
  }

  function handleSheetChange(name) {
    setSelectedSheet(name)
    if (workbook) parseSheet(workbook, name)
  }

  function updateRow(id, patch) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function applyCategorySuggestion(key) {
    const g = categoryGroups.find((x) => x.key === key)
    if (!g?.suggestion) return
    if (g.suggestion.source === 'existing') {
      setCategoryMapping((prev) => ({ ...prev, [key]: { action: 'existing', id: g.suggestion.id, label: g.suggestion.name } }))
    } else {
      const other = categoryMapping[g.suggestion.key]
      const name = other?.action === 'existing' ? other.label : other?.newName
      if (name) setCategoryMapping((prev) => ({ ...prev, [key]: { action: 'new', newName: name } }))
    }
  }

  function applySupplierSuggestion(key) {
    const g = supplierGroups.find((x) => x.key === key)
    if (!g?.suggestion) return
    if (g.suggestion.source === 'existing') {
      setSupplierMapping((prev) => ({ ...prev, [key]: { action: 'existing', id: g.suggestion.id, label: g.suggestion.name } }))
    } else {
      const other = supplierMapping[g.suggestion.key]
      const name = other?.action === 'existing' ? other.label : other?.newName
      if (name) setSupplierMapping((prev) => ({ ...prev, [key]: { action: 'new', newName: name } }))
    }
  }

  const includedRows = rows.filter((r) => r.include)
  const invalidIncludedRows = includedRows.filter((r) => !rowIsValid(r, categoryMapping, supplierMapping))
  const flaggedCount = rows.filter((r) => !rowIsValid(r, categoryMapping, supplierMapping)).length
  const newProductCount = new Set(
    includedRows.filter((r) => !r.matchedProductId).map((r) => r.productName.trim().toLowerCase())
  ).size
  const visibleRows = filterMode === 'flagged' ? rows.filter((r) => !rowIsValid(r, categoryMapping, supplierMapping)) : rows

  async function handleCommit() {
    setCommitError(null)
    if (invalidIncludedRows.length > 0) {
      setCommitError(`${invalidIncludedRows.length} included row(s) are missing required info — fix them or untick "include" first.`)
      setFilterMode('flagged')
      return
    }
    if (includedRows.length === 0) {
      setCommitError('No rows are selected to import.')
      return
    }

    setCommitting(true)
    try {
      const payload = {
        categoryMappings: Object.entries(categoryMapping).map(([key, m]) => ({ key, action: m.action, categoryId: m.id, newName: m.newName })),
        supplierMappings: Object.entries(supplierMapping).map(([key, m]) => ({ key, action: m.action, supplierId: m.id, newName: m.newName })),
        sourceLabel,
        effectiveDate,
        rows: includedRows.map((r) => {
          const vat = effectiveVat(r)
          return {
            categoryKey: r.categoryKey,
            supplierKey: r.supplierKey,
            productName: r.productName.trim(),
            unit: r.unit?.trim() || '',
            price: Number(r.price),
            vatStatus: vat.status,
            vatBasis: vat.basis || 'EXCLUSIVE',
            vatRate: defaultVatRate,
          }
        }),
      }
      const result = await commitImport(payload)
      setCommitResult(result)
      setStep('done')
    } catch (err) {
      setCommitError(err.message || 'Import failed')
    } finally {
      setCommitting(false)
    }
  }

  function reset() {
    setStep('upload')
    setFileName('')
    setSheetNames([])
    setSelectedSheet('')
    setWorkbook(null)
    setParseError(null)
    setRows([])
    setCategoryGroups([])
    setSupplierGroups([])
    setCategoryMapping({})
    setSupplierMapping({})
    setCommitResult(null)
    setCommitError(null)
  }

  if (step === 'done' && commitResult) {
    return (
      <div className="bg-surface border border-line rounded-lg p-6 max-w-xl">
        <h2 className="text-sm font-semibold mb-3">Import complete</h2>
        <ul className="text-sm text-muted space-y-1 mb-5">
          <li>{commitResult.priceEntries} price {commitResult.priceEntries === 1 ? 'entry' : 'entries'} recorded</li>
          <li>{commitResult.newProducts} new product{commitResult.newProducts === 1 ? '' : 's'} created</li>
          <li>{commitResult.newSupplierLinks} new supplier/product link{commitResult.newSupplierLinks === 1 ? '' : 's'} created</li>
        </ul>
        <button onClick={reset} className={btnPrimary}>Import another file</button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="bg-surface border border-line rounded-lg p-5">
        <label className={labelClass}>Spreadsheet file (.xlsx or .csv)</label>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="text-sm" />
        {sheetNames.length > 1 && (
          <div className="mt-3">
            <label className={labelClass}>Sheet</label>
            <select className={inputClass} value={selectedSheet} onChange={(e) => handleSheetChange(e.target.value)}>
              {sheetNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}
        {parseError && <p className="text-sm text-critical mt-3">{parseError}</p>}
        {rows.length > 0 && (
          <p className="text-sm text-muted mt-3">
            {rows.length} product rows found in <span className="font-medium text-foreground">{fileName}</span> ({categoryGroups.length} categories, {supplierGroups.length} suppliers after merging near-duplicate names).
          </p>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <div className="bg-surface border border-line rounded-lg p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Effective date for these prices</label>
              <input type="date" className={inputClass} value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Source reference</label>
              <input className={inputClass} value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} />
            </div>
          </div>

          <MappingTable
            title="Categories"
            groups={categoryGroups}
            mapping={categoryMapping}
            setMapping={setCategoryMapping}
            options={categories}
            onSuggestion={applyCategorySuggestion}
          />

          <MappingTable
            title="Suppliers"
            groups={supplierGroups}
            mapping={supplierMapping}
            setMapping={setSupplierMapping}
            options={suppliers}
            onSuggestion={applySupplierSuggestion}
          />

          <div className="bg-surface border border-line rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
              <h2 className="text-sm font-semibold">Rows to import</h2>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-muted">{includedRows.length} of {rows.length} selected · {flaggedCount} need attention</span>
                <button type="button" onClick={() => setFilterMode('all')} className={filterMode === 'all' ? btnSecondary : btnGhost}>
                  All
                </button>
                <button type="button" onClick={() => setFilterMode('flagged')} className={filterMode === 'flagged' ? btnSecondary : btnGhost}>
                  Needs attention ({flaggedCount})
                </button>
              </div>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-line">
                    <th className="px-3 py-2 font-medium w-8"></th>
                    <th className="px-3 py-2 font-medium">Product</th>
                    <th className="px-3 py-2 font-medium w-24">Unit</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Supplier</th>
                    <th className="px-3 py-2 font-medium w-28">Price</th>
                    <th className="px-3 py-2 font-medium w-56">VAT</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <RowLine
                      key={row.id}
                      row={row}
                      valid={rowIsValid(row, categoryMapping, supplierMapping)}
                      categoryLabel={categoryMapping[row.categoryKey]?.action === 'existing' ? categoryMapping[row.categoryKey].label : categoryMapping[row.categoryKey]?.newName}
                      supplierLabel={supplierMapping[row.supplierKey]?.action === 'existing' ? supplierMapping[row.supplierKey].label : supplierMapping[row.supplierKey]?.newName}
                      onUpdate={(patch) => updateRow(row.id, patch)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-surface border border-line rounded-lg p-5 flex items-center justify-between">
            <div className="text-sm text-muted">
              Will create <span className="font-medium text-foreground">{newProductCount}</span> new product{newProductCount === 1 ? '' : 's'} and record{' '}
              <span className="font-medium text-foreground">{includedRows.length}</span> price {includedRows.length === 1 ? 'entry' : 'entries'}. Nothing is saved yet.
            </div>
            <button onClick={handleCommit} disabled={committing} className={btnPrimary}>
              {committing ? 'Importing…' : 'Confirm import'}
            </button>
          </div>
          {commitError && <p className="text-sm text-critical">{commitError}</p>}
        </>
      )}
    </div>
  )
}

function MappingTable({ title, groups, mapping, setMapping, options, onSuggestion }) {
  if (groups.length === 0) return null
  return (
    <div className="bg-surface border border-line rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-line">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted mt-0.5">Map each name found in the file to an existing record, or create a new one.</p>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {groups.map((g) => {
            const m = mapping[g.key] ?? { action: 'new', newName: g.label }
            return (
              <tr key={g.key} className="border-b border-line last:border-b-0">
                <td className="px-5 py-2.5 align-top">
                  <div className="font-medium">{g.label}</div>
                  {g.variants.length > 1 && (
                    <div className="text-[11px] text-muted">{g.count} rows · spelled: {g.variants.join(', ')}</div>
                  )}
                  {m.action === 'new' && g.suggestion && (
                    <button type="button" onClick={() => onSuggestion(g.key)} className="text-[11px] text-accent-strong hover:underline mt-0.5">
                      Similar to &quot;{g.suggestion.name}&quot; — merge into it
                    </button>
                  )}
                </td>
                <td className="px-3 py-2.5 align-top w-56">
                  <select
                    className={inputClass}
                    value={m.action === 'existing' ? m.id : '__new__'}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setMapping((prev) => ({ ...prev, [g.key]: { action: 'new', newName: titleCase(g.label) } }))
                      } else {
                        const opt = options.find((o) => o.id === e.target.value)
                        setMapping((prev) => ({ ...prev, [g.key]: { action: 'existing', id: opt.id, label: opt.name } }))
                      }
                    }}
                  >
                    <option value="__new__">+ Create new</option>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2.5 align-top w-56">
                  {m.action === 'new' && (
                    <input
                      className={inputClass}
                      value={m.newName ?? ''}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [g.key]: { action: 'new', newName: e.target.value } }))}
                    />
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RowLine({ row, valid, categoryLabel, supplierLabel, onUpdate }) {
  const vat = effectiveVat(row)
  const isExistingExempt = row.matchedVatStatus === 'EXEMPT'
  const isExistingApplicable = row.matchedVatStatus === 'APPLICABLE'
  const isNew = !row.matchedProductId

  return (
    <tr className={`border-b border-line last:border-b-0 ${!valid ? 'bg-critical/5' : ''}`}>
      <td className="px-3 py-2 align-top">
        <input type="checkbox" checked={row.include} disabled={!valid} onChange={(e) => onUpdate({ include: e.target.checked })} />
      </td>
      <td className="px-3 py-2 align-top">
        <input className={inputClass} value={row.productName} onChange={(e) => onUpdate({ productName: e.target.value })} />
        {row.matchedProductId && <div className="text-[11px] text-muted mt-0.5">matches existing product</div>}
        {row.vat.hint && <div className="text-[11px] text-warn mt-0.5">{row.vat.hint}</div>}
      </td>
      <td className="px-3 py-2 align-top">
        <input className={inputClass} value={row.unit} onChange={(e) => onUpdate({ unit: e.target.value })} placeholder="pc" />
      </td>
      <td className="px-3 py-2 align-top text-muted">{categoryLabel || row.category}</td>
      <td className="px-3 py-2 align-top text-muted">{supplierLabel || row.supplierRaw || <span className="text-critical">missing</span>}</td>
      <td className="px-3 py-2 align-top">
        <input
          type="number"
          min="0"
          step="0.01"
          className={inputClass}
          value={row.price ?? ''}
          onChange={(e) => onUpdate({ price: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </td>
      <td className="px-3 py-2 align-top">
        {isExistingExempt ? (
          <span className="text-xs text-muted">Exempt (fixed for this product)</span>
        ) : isExistingApplicable ? (
          <select
            className={inputClass}
            value={vat.ok ? vat.basis : ''}
            onChange={(e) => onUpdate({ vatOverride: { status: 'APPLICABLE', basis: e.target.value } })}
          >
            <option value="" disabled>Select basis</option>
            <option value="EXCLUSIVE">Excl. VAT</option>
            <option value="INCLUSIVE">Incl. VAT</option>
          </select>
        ) : (
          <select
            className={inputClass}
            value={vat.ok ? (vat.status === 'EXEMPT' ? 'EXEMPT' : `APPLICABLE_${vat.basis}`) : ''}
            onChange={(e) => {
              const val = e.target.value
              if (val === 'EXEMPT') onUpdate({ vatOverride: { status: 'EXEMPT' } })
              else if (val) onUpdate({ vatOverride: { status: 'APPLICABLE', basis: val.split('_')[1] } })
            }}
          >
            <option value="" disabled>Select VAT treatment</option>
            <option value="EXEMPT">Exempt, no VAT</option>
            <option value="APPLICABLE_EXCLUSIVE">Applicable — price excl. VAT</option>
            <option value="APPLICABLE_INCLUSIVE">Applicable — price incl. VAT</option>
          </select>
        )}
        {isNew && !isExistingExempt && !isExistingApplicable && (
          <div className="text-[11px] text-muted mt-0.5">New product — this sets its permanent VAT classification.</div>
        )}
      </td>
    </tr>
  )
}
