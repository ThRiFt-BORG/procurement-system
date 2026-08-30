import PageHeader from '@/components/PageHeader'
import Card from '@/components/Card'
import { getSettings } from '@/lib/queries'
import { updateSettings } from '@/lib/actions/settings'
import { getCurrentUser } from '@/lib/auth'
import { inputClass, labelClass, btnPrimary } from '@/components/form'

export default async function SettingsPage({ searchParams }) {
  const [settings, user, params] = await Promise.all([getSettings(), getCurrentUser(), searchParams])
  const canEdit = user && ['MANAGER', 'ADMIN'].includes(user.role)

  return (
    <div>
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        subtitle="Company details appear on every printed LPO. The default VAT rate pre-fills new products."
      />

      {params?.saved && (
        <div className="max-w-xl mb-4 rounded-lg border border-good/30 bg-good-soft px-4 py-2.5 text-sm text-good">
          Settings saved.
        </div>
      )}

      <Card className="max-w-xl">
        {!canEdit && (
          <p className="text-sm text-muted mb-4">Only a manager can change these settings. You can view them below.</p>
        )}
        <fieldset disabled={!canEdit} className="disabled:opacity-60">
          <form action={updateSettings} className="space-y-4">
            <div>
              <label className={labelClass}>Company name</label>
              <input name="companyName" defaultValue={settings.companyName} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <input name="companyAddress" defaultValue={settings.companyAddress ?? ''} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Phone</label>
                <input name="companyPhone" defaultValue={settings.companyPhone ?? ''} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" name="companyEmail" defaultValue={settings.companyEmail ?? ''} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Default VAT rate (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="defaultVatRate"
                defaultValue={Number(settings.defaultVatRate)}
                className={`${inputClass} max-w-[140px]`}
              />
            </div>
            {canEdit && (
              <button type="submit" className={btnPrimary}>
                Save settings
              </button>
            )}
          </form>
        </fieldset>
      </Card>
    </div>
  )
}
