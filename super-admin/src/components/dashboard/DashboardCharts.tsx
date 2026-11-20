'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { RevenueChartDataPoint, HourlyRideVolume, DriverStatusDistribution } from '../../types';
import { formatETB } from '../../utils/formatters';

export interface DashboardChartsProps {
  revenueTrends: RevenueChartDataPoint[];
  hourlyVolume: HourlyRideVolume[];
  driverDistribution: DriverStatusDistribution[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  revenueTrends,
  hourlyVolume,
  driverDistribution,
}) => {
  return (
    <div className="row g-3 g-md-4 mb-4">
      {/* 7-Day Revenue & Volume Area Chart */}
      <div className="col-12 col-xl-8">
        <div
          className="card h-100 rounded-3 overflow-hidden"
          style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8', boxShadow: 'var(--shadow-sm)' }}
        >
          <div
            className="card-header border-bottom p-3 d-flex flex-wrap align-items-center justify-content-between gap-2"
            style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
          >
            <div>
              <h3 className="h6 fw-bold mb-0" style={{ color: '#252525' }}>
                Platform Revenue Trends (7 Days)
              </h3>
              <p className="small mb-0 mt-0.5" style={{ color: '#77736A' }}>
                Gross transaction volume across Taxi Rides, Hotel Stays, and Heritage Tours in ETB
              </p>
            </div>
            <span
              className="badge fw-bold px-2.5 py-1"
              style={{ backgroundColor: 'rgba(233, 184, 63, 0.22)', color: '#D99B19', border: '1px solid rgba(233, 184, 63, 0.4)' }}
            >
              Currency: ETB
            </span>
          </div>
          <div className="card-body p-3">
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E9B83F" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#E9B83F" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorRides" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#77736A" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#77736A" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3D8" />
                  <XAxis dataKey="day" stroke="#77736A" fontSize={12} />
                  <YAxis
                    stroke="#77736A"
                    fontSize={12}
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatETB(Number(value)), '']}
                    contentStyle={{
                      backgroundColor: '#FFFDF7',
                      border: '1px solid #E8E3D8',
                      borderRadius: '8px',
                      color: '#252525',
                      boxShadow: '0 4px 14px rgba(37, 37, 37, 0.08)',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="totalRevenue"
                    name="Total Gross (ETB)"
                    stroke="#D99B19"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="ridesRevenue"
                    name="Taxi Rides (ETB)"
                    stroke="#77736A"
                    strokeWidth={1.8}
                    fillOpacity={1}
                    fill="url(#colorRides)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Driver Fleet Status Donut */}
      <div className="col-12 col-xl-4">
        <div
          className="card h-100 rounded-3 overflow-hidden"
          style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8', boxShadow: 'var(--shadow-sm)' }}
        >
          <div
            className="card-header border-bottom p-3"
            style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
          >
            <h3 className="h6 fw-bold mb-0" style={{ color: '#252525' }}>
              Driver Fleet Availability
            </h3>
            <p className="small mb-0 mt-0.5" style={{ color: '#77736A' }}>
              Real-time driver operational states
            </p>
          </div>
          <div className="card-body p-3 d-flex flex-column align-items-center justify-content-center">
            <div style={{ width: '100%', height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={driverDistribution}
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {driverDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFDF7',
                      border: '1px solid #E8E3D8',
                      borderRadius: '8px',
                      color: '#252525',
                      boxShadow: '0 4px 14px rgba(37, 37, 37, 0.08)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend */}
            <div className="w-100 mt-2 px-1">
              <div className="row g-2">
                {driverDistribution.map((d, i) => (
                  <div key={i} className="col-6">
                    <div
                      className="d-flex align-items-center gap-2 p-2 rounded-2 border"
                      style={{ backgroundColor: '#F8F5EB', borderColor: '#E8E3D8' }}
                    >
                      <span
                        className="rounded-circle"
                        style={{ width: 10, height: 10, backgroundColor: d.color, flexShrink: 0 }}
                      />
                      <div className="overflow-hidden">
                        <div className="text-truncate" style={{ fontSize: '0.72rem', color: '#77736A' }}>
                          {d.name}
                        </div>
                        <div className="fw-bold small text-truncate" style={{ color: '#252525' }}>
                          {d.count} Drivers
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Ride Dispatch Volume */}
      <div className="col-12">
        <div
          className="card rounded-3 overflow-hidden"
          style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8', boxShadow: 'var(--shadow-sm)' }}
        >
          <div
            className="card-header border-bottom p-3 d-flex flex-wrap align-items-center justify-content-between gap-2"
            style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
          >
            <div>
              <h3 className="h6 fw-bold mb-0" style={{ color: '#252525' }}>
                Today&apos;s Hourly Dispatch Load
              </h3>
              <p className="small mb-0 mt-0.5" style={{ color: '#77736A' }}>
                Rides dispatched and completed by time window across Gondar
              </p>
            </div>
            <span
              className="badge px-2.5 py-1 border"
              style={{ backgroundColor: '#F2E9D5', color: '#252525', borderColor: '#E8E3D8' }}
            >
              Live Day Curve
            </span>
          </div>
          <div className="card-body p-3">
            <div style={{ width: '100%', height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyVolume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3D8" vertical={false} />
                  <XAxis dataKey="hour" stroke="#77736A" fontSize={11} />
                  <YAxis stroke="#77736A" fontSize={11} />
                  <Tooltip
                    formatter={(val) => [`${val} rides`, 'Dispatches']}
                    contentStyle={{
                      backgroundColor: '#FFFDF7',
                      border: '1px solid #E8E3D8',
                      borderRadius: '8px',
                      color: '#252525',
                      boxShadow: '0 4px 14px rgba(37, 37, 37, 0.08)',
                    }}
                  />
                  <Bar dataKey="rides" name="Rides Dispatched" fill="#E9B83F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
