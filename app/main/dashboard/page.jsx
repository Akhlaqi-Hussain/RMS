"use client";
import { useState, useEffect } from "react";
import {
  FaUtensils,
  FaMoneyBillWave,
  FaShoppingCart,
  FaChartLine,
  FaStar,
  FaTag,
  FaTicketAlt,
} from "react-icons/fa";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    todayDiscount: 0,
    todayRevenue: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [topMenuItems, setTopMenuItems] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();

      console.log(data.todaysStats);

      setStats({
        totalRevenue: data.netSales?.net_sales || 0,
        totalOrders: data.todaysStats?.todays_orders || 0,
        todayDiscount: data.todaysStats?.todays_discounts || 0,
        todayRevenue: data.todaysStats?.todays_net_sales || 0,
      });

      setRecentOrders(
        data.latestOrders?.map((order) => ({
          id: order.order_id,
          table: order.table_no,
          items: Math.round(order.total_amount / 100),
          amount: order.total_amount,
          status: order.status === "closed" ? "completed" : "pending",
          time: new Date(order.created_at).toLocaleTimeString("fa-IR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })) || []
      );

      setTopMenuItems(
        data.topItems?.map((item, index) => ({
          id: index + 1,
          name: item.name,
          orders: item.total_sold,
          revenue: item.total_revenue,
        })) || []
      );
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
  };

  const StatCard = ({ title, value, icon }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
          {icon}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
      </div>
    </div>
  );

  const StatusBadge = ({ status }) => {
    const statusConfig = {
      completed: {
        color: "bg-green-50 text-green-700 border-green-200",
        text: "تکمیل شده",
      },
      preparing: {
        color: "bg-yellow-50 text-yellow-700 border-yellow-200",
        text: "در حال آماده سازی",
      },
      pending: {
        color: "bg-red-50 text-red-700 border-red-200",
        text: "در انتظار",
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}
      >
        {config.text}
      </span>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-4">
          داشبورد
        </h1>
        <p className="text-gray-600 mt-2">بررسی عملکرد و آمار رستوران</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="درآمد کل"
          value={stats.totalRevenue}
          icon={<FaMoneyBillWave className="text-blue-600" size={20} />}
        />
        <StatCard
          title="درآمد امروز"
          value={stats.todayRevenue}
          icon={<FaChartLine className="text-purple-600" size={20} />}
        />
        <StatCard
          title="تخیف های امروز"
          value={stats.todayDiscount}
          icon={<FaTicketAlt className="text-orange-600" size={20} />}
        />
        <StatCard
          title="سفارشات امروز"
          value={stats.totalOrders}
          icon={<FaShoppingCart className="text-green-600" size={20} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">سفارشات اخیر</h2>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">
                      {order.table}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      میز {order.table}
                    </p>
                    <p className="text-sm text-gray-500">{order.items} آیتم</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      {order.amount.toLocaleString("fa-IR")} ؋
                    </p>
                    <p className="text-sm text-gray-500">{order.time}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Menu Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">
              محبوب ترین آیتم ها
            </h2>
            <FaStar className="text-yellow-500" size={16} />
          </div>
          <div className="space-y-3">
            {topMenuItems.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index === 0
                        ? "bg-yellow-100"
                        : index === 1
                        ? "bg-gray-100"
                        : index === 2
                        ? "bg-orange-100"
                        : "bg-blue-100"
                    }`}
                  >
                    <span
                      className={`text-sm font-bold ${
                        index === 0
                          ? "text-yellow-600"
                          : index === 1
                          ? "text-gray-600"
                          : index === 2
                          ? "text-orange-600"
                          : "text-blue-600"
                      }`}
                    >
                      {index + 1}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.orders} سفارش</p>
                  </div>
                </div>
                <p className="font-bold text-gray-900">
                  {item.revenue.toLocaleString("fa-IR")} ؋
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
