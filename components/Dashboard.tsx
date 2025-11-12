import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import LogoMarkV from '../imports/LogoMarkV1';
import {
  Database,
  Image as ImageIcon,
  RefreshCw,
  Activity,
  UploadCloud,
  FolderOpen,
  Settings2,
  PlaySquare,
  Clock3,
  LogOut,
  DollarSign,
  CalendarDays,
} from 'lucide-react';

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const stats = [
    { label: 'Cold Storage (Glacier)', value: '2.4 TB', trend: '+12%', icon: Database, accent: 'text-blue-600 bg-blue-100' },
    { label: 'Warm Storage (S3 Buckets)', value: '1,248 objects', trend: '+24', icon: ImageIcon, accent: 'text-pink-600 bg-pink-100' },
    { label: 'Active Backups', value: '3', trend: 'Live', icon: RefreshCw, accent: 'text-teal-600 bg-teal-100' },
    { label: 'Uptime', value: '99.9%', trend: '30 days', icon: Activity, accent: 'text-amber-600 bg-amber-100' },
  ];

  const costInfo = {
    currentMonth: '$24.50',
    nextBilling: 'Dec 15, 2025',
    breakdown: [
      { item: 'Infrastructure', cost: '$15.00' },
      { item: 'Storage (2.4 TB)', cost: '$8.00' },
      { item: 'Bandwidth', cost: '$1.50' },
    ]
  };

  const recentUploads = [
    { name: 'Family Vacation 2024', size: '1.2 GB', date: '2 hours ago', type: 'Album' },
    { name: 'Wedding Photos', size: '3.4 GB', date: '1 day ago', type: 'Album' },
    { name: 'Baby First Steps.mp4', size: '245 MB', date: '3 days ago', type: 'Video' },
    { name: 'Birthday Party', size: '892 MB', date: '5 days ago', type: 'Album' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10">
                <LogoMarkV />
              </div>
              <span className="sr-only">Glacia Dashboard</span>
            </div>
            <Button onClick={onLogout} variant="outline">
              <LogOut className="size-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-12 gap-8">

          {/* Main Content */}
          <main className="lg:col-span-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-8">
                <h1 className="text-gray-900 mb-2">
                  Welcome back!
                </h1>
                <p className="text-gray-600 leading-relaxed">
                  Here's what's happening with your memories today.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => {
                  const StatIcon = stat.icon;
                  return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                  >
                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-2 rounded-lg ${stat.accent}`}>
                          <StatIcon className="size-5" />
                        </div>
                        <span className="text-sm text-green-600">{stat.trend}</span>
                      </div>
                      <div className="text-gray-900 mb-1">
                        {stat.value}
                      </div>
                      <div className="text-sm text-gray-600">{stat.label}</div>
                    </Card>
                  </motion.div>
                )})}
              </div>

              {/* Cost & Billing Section */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Current Month Cost */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                        <DollarSign className="size-6" />
                      </div>
                      <div>
                        <h3 className="text-gray-900">Current Month Cost</h3>
                        <p className="text-sm text-gray-600">November 2025</p>
                      </div>
                    </div>
                    <div className="text-gray-900 mb-6">
                      {costInfo.currentMonth}
                    </div>
                    <div className="space-y-3 border-t pt-4">
                      {costInfo.breakdown.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{item.item}</span>
                          <span className="text-gray-900">{item.cost}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </motion.div>

                {/* Next Billing */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                        <CalendarDays className="size-6" />
                      </div>
                      <div>
                        <h3 className="text-gray-900">Next Billing Date</h3>
                        <p className="text-sm text-gray-600">Automatic payment</p>
                      </div>
                    </div>
                    <div className="text-gray-900 mb-6">
                      {costInfo.nextBilling}
                    </div>
                    <div className="space-y-3 border-t pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Estimated amount</span>
                        <span className="text-gray-900">{costInfo.currentMonth}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Payment method</span>
                        <span className="text-gray-900">•••• 4242</span>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        Update Billing Info
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              </div>

              {/* Quick Actions */}
              <Card className="p-6 mb-8">
                <h3 className="text-gray-900 mb-4">
                  Quick Actions
                </h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <Button className="bg-blue-600 hover:bg-blue-700 h-auto py-4 flex-col gap-2">
                    <UploadCloud className="size-6" />
                    <span>Upload Files</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                    <FolderOpen className="size-6 text-blue-600" />
                    <span>Browse Files</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                    <Settings2 className="size-6 text-blue-600" />
                    <span>Configure Backup</span>
                  </Button>
                </div>
              </Card>

              {/* Recent Uploads */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-gray-900">
                    Recent Uploads
                  </h3>
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </div>
                <div className="space-y-4">
                  {recentUploads.map((upload, index) => {
                    const TypeIcon = upload.type === 'Video' ? PlaySquare : ImageIcon;
                    return (
                    <motion.div
                      key={upload.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                          <TypeIcon className="size-5" />
                        </div>
                        <div>
                          <div className="text-gray-900 mb-1">{upload.name}</div>
                          <div className="text-sm text-gray-600">
                            {upload.type} • {upload.size}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock3 className="size-4" />
                        <span>{upload.date}</span>
                      </div>
                    </motion.div>
                  )})}
                </div>
              </Card>
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}
