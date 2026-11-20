'use client';

import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Save,
  Percent,
  Radio,
  Shield,
  Bell,
  Building,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { settingsService } from '../../../services/settingsService';
import { SystemSettings } from '../../../types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await settingsService.getSettings();
        setSettings(data);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!settings) return;
    const { name, value, type } = e.target;
    setSettings({
      ...settings,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : type === 'number'
          ? Number(value)
          : value,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await settingsService.updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-gold" role="status" />
        <p className="text-muted mt-2 small">Loading platform configurations...</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Platform & Operational Settings"
        description="Commission schedules in ETB, dispatch radius parameters, security policies, and SMS/Telegram notification channels"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'System Settings' },
        ]}
      />

      <form onSubmit={handleSave}>
        {saveSuccess && (
          <div
            className="alert alert-success d-flex align-items-center gap-2 py-2.5 px-3 mb-4 rounded-3 text-sm"
            role="alert"
          >
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <div>Platform configurations successfully updated and synchronized!</div>
          </div>
        )}

        <div className="row g-4">
          {/* Section 1: General Platform Information */}
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 rounded-3 h-100">
              <div className="card-header bg-white border-bottom border-light p-3">
                <div className="d-flex align-items-center gap-2">
                  <Building size={18} className="text-gold" />
                  <h3 className="h6 fw-bold text-obsidian mb-0">General Operations & Headquarters</h3>
                </div>
              </div>
              <div className="card-body p-3">
                <div className="mb-3">
                  <label className="form-label text-sm fw-medium text-obsidian mb-1">
                    Platform Legal Name
                  </label>
                  <input
                    type="text"
                    name="platformName"
                    value={settings.platformName}
                    onChange={handleChange}
                    className="form-control form-control-sm py-2 shadow-none"
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Support Email
                    </label>
                    <input
                      type="email"
                      name="supportEmail"
                      value={settings.supportEmail}
                      onChange={handleChange}
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>
                  <div className="col-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Support Telephone
                    </label>
                    <input
                      type="tel"
                      name="supportPhone"
                      value={settings.supportPhone}
                      onChange={handleChange}
                      className="form-control form-control-sm py-2 shadow-none font-monospace"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label text-sm fw-medium text-obsidian mb-1">
                    Headquarters Address (Gondar)
                  </label>
                  <input
                    type="text"
                    name="headquartersAddress"
                    value={settings.headquartersAddress}
                    onChange={handleChange}
                    className="form-control form-control-sm py-2 shadow-none"
                  />
                </div>

                <div>
                  <label className="form-label text-sm fw-medium text-obsidian mb-1">
                    Standard Settlement Currency
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${settings.defaultCurrency} (Ethiopian Birr)`}
                    className="form-control form-control-sm py-2 shadow-none bg-light fw-bold text-gold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Platform Commission Rates */}
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 rounded-3 h-100">
              <div className="card-header bg-white border-bottom border-light p-3">
                <div className="d-flex align-items-center gap-2">
                  <Percent size={18} className="text-gold" />
                  <h3 className="h6 fw-bold text-obsidian mb-0">Platform Commission Schedules</h3>
                </div>
              </div>
              <div className="card-body p-3">
                <div className="mb-3">
                  <label className="form-label text-sm fw-medium text-obsidian mb-1">
                    Driver Taxi Trip Commission (%)
                  </label>
                  <div className="input-group input-group-sm">
                    <input
                      type="number"
                      name="driverCommissionPercentage"
                      value={settings.driverCommissionPercentage}
                      onChange={handleChange}
                      min="0"
                      max="50"
                      className="form-control py-2 shadow-none font-monospace"
                    />
                    <span className="input-group-text bg-light text-muted">%</span>
                  </div>
                  <span className="text-muted text-xs">Standard platform fee deducted per completed ride.</span>
                </div>

                <div className="mb-3">
                  <label className="form-label text-sm fw-medium text-obsidian mb-1">
                    Partner Hotel Reservation Fee (%)
                  </label>
                  <div className="input-group input-group-sm">
                    <input
                      type="number"
                      name="hotelBookingCommissionPercentage"
                      value={settings.hotelBookingCommissionPercentage}
                      onChange={handleChange}
                      min="0"
                      max="30"
                      className="form-control py-2 shadow-none font-monospace"
                    />
                    <span className="input-group-text bg-light text-muted">%</span>
                  </div>
                  <span className="text-muted text-xs">Commission on confirmed lodging reservations.</span>
                </div>

                <div>
                  <label className="form-label text-sm fw-medium text-obsidian mb-1">
                    Heritage & Tourism Tour Commission (%)
                  </label>
                  <div className="input-group input-group-sm">
                    <input
                      type="number"
                      name="heritageTourCommissionPercentage"
                      value={settings.heritageTourCommissionPercentage}
                      onChange={handleChange}
                      min="0"
                      max="30"
                      className="form-control py-2 shadow-none font-monospace"
                    />
                    <span className="input-group-text bg-light text-muted">%</span>
                  </div>
                  <span className="text-muted text-xs">Platform margin on guided heritage expedition packages.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Dispatch & GPS Radar Parameters */}
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 rounded-3 h-100">
              <div className="card-header bg-white border-bottom border-light p-3">
                <div className="d-flex align-items-center gap-2">
                  <Radio size={18} className="text-gold" />
                  <h3 className="h6 fw-bold text-obsidian mb-0">Dispatch & GPS Telemetry Engine</h3>
                </div>
              </div>
              <div className="card-body p-3">
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Max Driver Search Radius
                    </label>
                    <div className="input-group input-group-sm">
                      <input
                        type="number"
                        name="maxDriverSearchRadiusKm"
                        value={settings.maxDriverSearchRadiusKm}
                        onChange={handleChange}
                        className="form-control py-2 shadow-none"
                      />
                      <span className="input-group-text bg-light text-muted">km</span>
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Driver Acceptance Timeout
                    </label>
                    <div className="input-group input-group-sm">
                      <input
                        type="number"
                        name="rideAcceptanceTimeoutSeconds"
                        value={settings.rideAcceptanceTimeoutSeconds}
                        onChange={handleChange}
                        className="form-control py-2 shadow-none"
                      />
                      <span className="input-group-text bg-light text-muted">sec</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="form-label text-sm fw-medium text-obsidian mb-1">
                    GPS Location Ping Frequency
                  </label>
                  <div className="input-group input-group-sm">
                    <input
                      type="number"
                      name="gpsUpdateIntervalSeconds"
                      value={settings.gpsUpdateIntervalSeconds}
                      onChange={handleChange}
                      className="form-control py-2 shadow-none"
                    />
                    <span className="input-group-text bg-light text-muted">seconds</span>
                  </div>
                  <span className="text-muted text-xs">
                    Frequency at which driver mobile apps upload live coordinates.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Security & Notification Gateways */}
          <div className="col-12 col-lg-6">
            <div className="card shadow-sm border-0 rounded-3 h-100">
              <div className="card-header bg-white border-bottom border-light p-3">
                <div className="d-flex align-items-center gap-2">
                  <Shield size={18} className="text-gold" />
                  <h3 className="h6 fw-bold text-obsidian mb-0">Security & Gateway Channels</h3>
                </div>
              </div>
              <div className="card-body p-3">
                <div className="form-check form-switch mb-3">
                  <input
                    className="form-check-input shadow-none"
                    type="checkbox"
                    id="twoFaSwitch"
                    name="twoFactorAuthEnforced"
                    checked={settings.twoFactorAuthEnforced}
                    onChange={handleChange}
                  />
                  <label className="form-check-label text-sm fw-medium text-obsidian" htmlFor="twoFaSwitch">
                    Enforce Two-Factor Authentication (2FA) for All Administrators
                  </label>
                </div>

                <div className="form-check form-switch mb-3">
                  <input
                    className="form-check-input shadow-none"
                    type="checkbox"
                    id="tgBotSwitch"
                    name="telegramBotAlertsEnabled"
                    checked={settings.telegramBotAlertsEnabled}
                    onChange={handleChange}
                  />
                  <label className="form-check-label text-sm fw-medium text-obsidian" htmlFor="tgBotSwitch">
                    Telegram Bot OTP & Emergency Alert Service Active
                  </label>
                </div>

                <div className="form-check form-switch">
                  <input
                    className="form-check-input shadow-none"
                    type="checkbox"
                    id="smsSwitch"
                    name="smsAlertsEnabled"
                    checked={settings.smsAlertsEnabled}
                    onChange={handleChange}
                  />
                  <label className="form-check-label text-sm fw-medium text-obsidian" htmlFor="smsSwitch">
                    SMS Gateway Backup Alerts Active
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="card shadow-sm border-0 rounded-3 mt-4 p-3 d-flex flex-row align-items-center justify-content-between bg-white">
          <span className="text-muted small">
            Changes will take effect immediately across dispatch and billing services.
          </span>
          <button
            type="submit"
            disabled={isSaving}
            className="btn btn-gold btn-sm px-4 fw-bold d-flex align-items-center gap-1.5 shadow"
          >
            {isSaving ? (
              <span className="spinner-border spinner-border-sm" role="status" />
            ) : (
              <Save size={16} />
            )}
            <span>Save Platform Configurations</span>
          </button>
        </div>
      </form>
    </div>
  );
}
