/**
 * Demo Admin Center Component - Enterprise SaaS Grade
 * Administrative dashboard for account management and SEO optimization
 */

import React, { useState } from 'react';
import {
  Shield,
  Users,
  Settings,
  Globe,
  Lock,
  TrendingUp,
  Target,
  BarChart3,
  FileText,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DemoAdminPanel() {
  const [selectedRole, setSelectedRole] = useState('ALL');

  // SEO Data
  const seoMetrics = {
    searchRanking: 15,
    organicTraffic: 1247,
    pageSpeed: 94,
    keywordCount: 23,
    backlinks: 156
  };

  // Account management data
  const adminAccounts = [
    {
      id: '1',
      name: 'Max Mustermann',
      email: 'max@restaurant-demo.de',
      role: 'OWNER',
      status: 'ACTIVE',
      lastLogin: '2 Minuten',
      permissions: ['FULL_ACCESS', 'BILLING', 'USER_MANAGEMENT', 'SEO_TOOLS']
    },
    {
      id: '2',
      name: 'Sarah Schmidt',
      email: 'sarah@restaurant-demo.de',
      role: 'ADMIN',
      status: 'ACTIVE',
      lastLogin: '1 Stunde',
      permissions: ['USER_MANAGEMENT', 'SEO_TOOLS', 'ANALYTICS']
    },
    {
      id: '3',
      name: 'Tom Weber',
      email: 'tom@restaurant-demo.de',
      role: 'SEO_MANAGER',
      status: 'ACTIVE',
      lastLogin: '3 Stunden',
      permissions: ['SEO_TOOLS', 'ANALYTICS', 'CONTENT_MANAGEMENT']
    }
  ];

  return (
    <div className="space-y-6">
      {/* Enterprise Header */}
      <div className="card-elevated bg-white rounded-2xl p-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                <span>Admin-Center</span>
                <div className="px-2 py-1 bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs font-bold rounded-full">
                  SECURE
                </div>
              </h1>
              <p className="text-gray-600 mt-1">Account-Verwaltung und SEO-Optimization für maximale Sichtbarkeit</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">System Health: 98%</span>
            </div>
            <button className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all">
              Export Logs
            </button>
          </div>
        </div>
      </div>

      {/* Admin Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          {
            title: 'Admin Accounts',
            value: adminAccounts.length,
            change: 'Aktive Benutzer',
            icon: Users,
            color: 'from-blue-500 to-blue-600'
          },
          {
            title: 'SEO Score',
            value: `${seoMetrics.pageSpeed}/100`,
            change: '+8 diese Woche',
            icon: Globe,
            color: 'from-green-500 to-green-600'
          },
          {
            title: 'Organischer Traffic',
            value: seoMetrics.organicTraffic,
            change: '+15% vs. letzten Monat',
            icon: TrendingUp,
            color: 'from-purple-500 to-purple-600'
          },
          {
            title: 'Search Ranking',
            value: `#${seoMetrics.searchRanking}`,
            change: 'Position verbessert',
            icon: Target,
            color: 'from-orange-500 to-orange-600'
          },
          {
            title: 'Security Events',
            value: '0',
            change: 'Letzte 24h',
            icon: Lock,
            color: 'from-emerald-500 to-emerald-600'
          }
        ].map((metric, index) => (
          <div key={index} className="card-elevated bg-white rounded-xl p-4 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-r flex items-center justify-center shadow-sm', metric.color)}>
                <metric.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                {metric.change}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-sm text-gray-600">{metric.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Admin Account Management */}
        <div className="xl:col-span-2">
          <div className="card-elevated bg-white rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Admin-Account-Verwaltung</h3>
                    <p className="text-sm text-gray-500">Benutzer, Rollen und Berechtigungen verwalten</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="ALL">Alle Rollen</option>
                    <option value="OWNER">Owner</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SEO_MANAGER">SEO Manager</option>
                  </select>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    + Neuer Admin
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {adminAccounts.map((account) => (
                <div key={account.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {account.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{account.name}</h4>
                        <p className="text-sm text-gray-600">{account.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{account.role}</p>
                        <p className="text-xs text-gray-500">Letzter Login: {account.lastLogin}</p>
                      </div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {account.permissions.map((permission) => (
                      <span
                        key={permission}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
                      >
                        {permission.replace('_', ' ')}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors">
                      Bearbeiten
                    </button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors">
                      Berechtigungen
                    </button>
                    <button className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 transition-colors">
                      Deaktivieren
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SEO Optimization Panel */}
        <div className="xl:col-span-1">
          <div className="card-elevated bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">SEO-Optimization</h3>
                  <p className="text-sm text-gray-500">Sichtbarkeit maximieren</p>
                </div>
              </div>
            </div>

            {/* SEO Health Score */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">SEO Health Score</span>
                <span className="text-lg font-bold text-green-600">{seoMetrics.pageSpeed}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all"
                  style={{ width: `${seoMetrics.pageSpeed}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Excellent - Keine kritischen Probleme</p>
            </div>

            {/* SEO Metrics */}
            <div className="space-y-4 mb-6">
              {[
                {
                  title: 'Keywords Ranking',
                  value: `${seoMetrics.keywordCount} Keywords`,
                  status: 'Gut',
                  color: 'text-green-600'
                },
                {
                  title: 'Page Speed',
                  value: `${seoMetrics.pageSpeed}/100`,
                  status: 'Hervorragend',
                  color: 'text-green-600'
                },
                {
                  title: 'Backlinks',
                  value: `${seoMetrics.backlinks} Links`,
                  status: 'Wachsend',
                  color: 'text-blue-600'
                },
                {
                  title: 'Local SEO',
                  value: 'Position #15',
                  status: 'Verbessert',
                  color: 'text-orange-600'
                }
              ].map((metric, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{metric.title}</p>
                    <p className="text-xs text-gray-600">{metric.value}</p>
                  </div>
                  <span className={cn('text-xs font-medium px-2 py-1 rounded-full',
                    metric.status === 'Hervorragend' ? 'bg-green-100 text-green-700' :
                    metric.status === 'Gut' ? 'bg-blue-100 text-blue-700' :
                    metric.status === 'Wachsend' ? 'bg-purple-100 text-purple-700' :
                    'bg-orange-100 text-orange-700'
                  )}>
                    {metric.status}
                  </span>
                </div>
              ))}
            </div>

            {/* SEO Quick Actions */}
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:shadow-lg transition-all">
                <Globe className="w-4 h-4" />
                <span>SEO Audit starten</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                  <FileText className="w-4 h-4" />
                  <span>Sitemap</span>
                </button>
                <button className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Security & Settings */}
      <div className="card-elevated bg-white rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
              <Lock className="w-5 h-5" />
              <span>System Security & Einstellungen</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">Sicherheit überwachen und Systemeinstellungen verwalten</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            {
              title: 'Two-Factor Auth',
              status: 'Aktiviert',
              description: 'Zusätzlicher Schutz für Admin-Accounts',
              icon: Shield,
              statusColor: 'text-green-600',
              bgColor: 'bg-green-50'
            },
            {
              title: 'SSL Certificate',
              status: 'Gültig bis Dez 2026',
              description: 'HTTPS-Verschlüsselung aktiv',
              icon: Lock,
              statusColor: 'text-green-600',
              bgColor: 'bg-green-50'
            },
            {
              title: 'Backup System',
              status: 'Täglich um 3:00',
              description: 'Automatische Datensicherung',
              icon: Settings,
              statusColor: 'text-blue-600',
              bgColor: 'bg-blue-50'
            },
            {
              title: 'System Updates',
              status: 'Up to Date',
              description: 'Letzte Aktualisierung: Gestern',
              icon: RefreshCw,
              statusColor: 'text-green-600',
              bgColor: 'bg-green-50'
            }
          ].map((item, index) => (
            <div key={index} className={cn('rounded-xl p-4 border', item.bgColor)}>
              <div className="flex items-center justify-between mb-3">
                <item.icon className={cn('w-6 h-6', item.statusColor)} />
                <span className={cn('text-xs font-medium px-2 py-1 rounded-full',
                  item.statusColor === 'text-green-600' ? 'bg-green-100 text-green-700' :
                  'bg-blue-100 text-blue-700'
                )}>
                  {item.status}
                </span>
              </div>
              <h4 className="font-medium text-gray-900 mb-1">{item.title}</h4>
              <p className="text-sm text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
