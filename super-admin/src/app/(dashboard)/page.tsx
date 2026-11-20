'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Car,
  Navigation,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Building2,
  BedDouble,
  Landmark,
  Compass,
  HelpCircle,
  Radio,
  Plus,
  RefreshCw,
  Server,
  Activity,
  CalendarCheck,
  ShieldAlert,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DashboardCharts } from '../../components/dashboard/DashboardCharts';
import { dashboardService } from '../../services/dashboardService';
import {
  DashboardKPISummary,
  RevenueChartDataPoint,
  HourlyRideVolume,
  DriverStatusDistribution,
  RecentActivityItem,
  SystemServiceHealth,
} from '../../types';
import { formatETB, formatNumber } from '../../utils/formatters';

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPISummary | null>(null);
  const [revenueTrends, setRevenueTrends] = useState<RevenueChartDataPoint[]>([]);
  const [hourlyVolume, setHourlyVolume] = useState<HourlyRideVolume[]>([]);
  const [driverDistribution, setDriverDistribution] = useState<DriverStatusDistribution[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemServiceHealth[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [kpiRes, revRes, hourRes, driverDistRes, actRes, healthRes] = await Promise.all([
        dashboardService.getKPISummary(),
        dashboardService.getRevenueTrends(),
        dashboardService.getHourlyVolume(),
        dashboardService.getDriverStatusDistribution(),
        dashboardService.getRecentActivity(),
        dashboardService.getSystemHealth(),
      ]);

      setKpis(kpiRes);
      setRevenueTrends(revRes);
      setHourlyVolume(hourRes);
      setDriverDistribution(driverDistRes);
      setRecentActivity(actRes);
      setSystemHealth(healthRes);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title="Executive Operations Dashboard"
        description="Real-time mobility telemetry, lodging occupancy, and tourism operations across Gondar and regional hubs"
        actions={
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5"
              onClick={fetchDashboardData}
              disabled={isLoading}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <Link
              href="/ride-monitoring"
              className="btn btn-gold btn-sm d-flex align-items-center gap-1.5 fw-semibold"
            >
              <Radio size={14} className="animate-pulse" />
              <span>Live Ride Radar</span>
            </Link>
          </div>
        }
      />

      {/* 12 Key Performance Indicator Cards */}
      <div className="row g-3 mb-4">
        {/* Row 1: Mobility & Fleet */}
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Active Drivers"
            value={kpis ? formatNumber(kpis.activeDrivers) : '...'}
            icon={Users}
            accentColor="emerald"
            trend={{ value: '+14%', isPositive: true, label: 'vs last week' }}
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Registered Fleet"
            value={kpis ? formatNumber(kpis.totalDrivers) : '...'}
            icon={Car}
            subtext="Gondar, Bahir Dar & Regional"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Registered Passengers"
            value={kpis ? formatNumber(kpis.registeredPassengers) : '...'}
            icon={Users}
            accentColor="gold"
            trend={{ value: '+22%', isPositive: true, label: 'new this month' }}
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Active Live Rides"
            value={kpis ? formatNumber(kpis.activeLiveRides) : '...'}
            icon={Navigation}
            accentColor="amber"
            subtext="Simulated GPS Active"
          />
        </div>

        {/* Row 2: Rides & Financials */}
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Today's Completed Rides"
            value={kpis ? formatNumber(kpis.todayCompletedRides) : '...'}
            icon={CheckCircle2}
            accentColor="emerald"
            trend={{ value: '+8%', isPositive: true }}
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Today's Gross Volume"
            value={kpis ? formatETB(kpis.todayGrossRevenueETB) : '...'}
            icon={DollarSign}
            accentColor="gold"
            subtext="All channels combined"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Platform Commission (15%)"
            value={kpis ? formatETB(kpis.platformCommissionRevenueETB) : '...'}
            icon={TrendingUp}
            accentColor="gold"
            trend={{ value: '+18.5%', isPositive: true }}
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Open Support Inquiries"
            value={kpis ? formatNumber(kpis.openSupportTickets) : '...'}
            icon={HelpCircle}
            accentColor="rose"
            subtext="Avg response: 18 mins"
          />
        </div>

        {/* Row 3: Hospitality & Tourism */}
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Partner Hotels"
            value={kpis ? formatNumber(kpis.partnerHotels) : '...'}
            icon={Building2}
            accentColor="slate"
            subtext="Goha, Haile, Gondar Hills"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Room Inventory"
            value={kpis ? `${kpis.bookedHotelRooms}/${kpis.totalHotelRooms}` : '...'}
            icon={BedDouble}
            accentColor="amber"
            subtext={
              kpis
                ? `${Math.round((kpis.bookedHotelRooms / kpis.totalHotelRooms) * 100)}% Booked`
                : ''
            }
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Heritage Destinations"
            value={kpis ? formatNumber(kpis.heritageDestinations) : '...'}
            icon={Landmark}
            accentColor="gold"
            subtext="Fasil Ghebbi, Simien, Lalibela"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Heritage Tour Bookings"
            value={kpis ? formatNumber(kpis.heritageTourBookings) : '...'}
            icon={Compass}
            accentColor="emerald"
            trend={{ value: '+35%', isPositive: true, label: 'tourism season' }}
          />
        </div>
      </div>

      {/* Analytics Recharts Section */}
      <DashboardCharts
        revenueTrends={revenueTrends}
        hourlyVolume={hourlyVolume}
        driverDistribution={driverDistribution}
      />

      {/* Bottom Dual Panels: Recent Platform Feed & System Health */}
      <div className="row g-4">
        {/* Recent Activity Feed */}
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm border-0 rounded-3 h-100">
            <div className="card-header bg-white border-bottom border-light p-3 d-flex align-items-center justify-content-between">
              <div>
                <h3 className="h6 fw-bold text-obsidian mb-0">Recent Operational Activity</h3>
                <p className="text-muted small mb-0">
                  Real-time events across rides, driver onboarding, and tour bookings
                </p>
              </div>
              <Activity size={18} className="text-muted" />
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush">
                {recentActivity.map((act) => (
                  <div key={act.id} className="list-group-item p-3 border-light">
                    <div className="d-flex align-items-start justify-content-between gap-3">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="fw-semibold text-obsidian small">{act.title}</span>
                          {act.statusBadge && (
                            <span
                              className={`badge rounded-pill text-xs ${
                                act.statusBadge.variant === 'gold'
                                  ? 'bg-gold-subtle text-gold'
                                  : act.statusBadge.variant === 'success'
                                  ? 'bg-success-subtle text-success'
                                  : act.statusBadge.variant === 'warning'
                                  ? 'bg-warning-subtle text-warning'
                                  : 'bg-danger-subtle text-danger'
                              }`}
                            >
                              {act.statusBadge.text}
                            </span>
                          )}
                        </div>
                        <p className="text-muted small mb-1">{act.description}</p>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {act.timestamp}
                        </span>
                      </div>

                      {act.amountETB && (
                        <div className="text-end flex-shrink-0">
                          <span className="fw-bold text-gold small">{formatETB(act.amountETB)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-footer bg-white border-top border-light p-2.5 text-center">
              <Link
                href="/ride-history"
                className="text-gold text-decoration-none small fw-semibold"
              >
                View Full Operations Audit Trail &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Live System & Infrastructure Health */}
        <div className="col-12 col-lg-5">
          <div className="card shadow-sm border-0 rounded-3 h-100">
            <div className="card-header bg-white border-bottom border-light p-3 d-flex align-items-center justify-content-between">
              <div>
                <h3 className="h6 fw-bold text-obsidian mb-0">Platform Infrastructure Status</h3>
                <p className="text-muted small mb-0">Telemetry, database, bot & payment gateways</p>
              </div>
              <Server size={18} className="text-muted" />
            </div>
            <div className="card-body p-3">
              <div className="d-flex flex-column gap-3">
                {systemHealth.map((srv) => (
                  <div
                    key={srv.id}
                    className="p-3 rounded-3 border border-light d-flex align-items-center justify-content-between bg-light"
                  >
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span
                          className="rounded-circle bg-success animate-pulse"
                          style={{ width: 8, height: 8 }}
                        />
                        <span className="fw-semibold text-obsidian text-sm">{srv.name}</span>
                      </div>
                      <div className="d-flex align-items-center gap-3 text-muted text-xs">
                        <span>Latency: {srv.latencyMs}ms</span>
                        <span>•</span>
                        <span>Uptime: {srv.uptimePercentage}</span>
                      </div>
                    </div>

                    <span className="badge bg-success-subtle text-success fw-semibold">
                      {srv.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* Server Details summary */}
              <div
                className="mt-3 p-3 rounded-3 border"
                style={{
                  backgroundColor: '#F2E9D5',
                  color: '#252525',
                  borderColor: '#E8E3D8',
                }}
              >
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-gold text-xs fw-bold text-uppercase">
                    Gondar Command Dispatch Engine
                  </span>
                  <span className="badge bg-gold text-dark text-xs fw-bold">ONLINE</span>
                </div>
                <p className="small mb-2" style={{ color: '#77736A', fontSize: '0.8125rem' }}>
                  Dispatch algorithms running with 12km search radius. Telegram OTP verification bot
                  is connected and operational.
                </p>
                <div className="d-flex justify-content-between text-xs" style={{ color: '#77736A' }}>
                  <span>Environment: Production Monorepo</span>
                  <span>SSL: Enforced</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
