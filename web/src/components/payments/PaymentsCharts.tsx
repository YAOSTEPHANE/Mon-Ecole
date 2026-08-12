'use client';

import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FiTrendingUp, FiCreditCard } from 'react-icons/fi';
import Card from '../ui/Card';
import { formatFCFA } from '../../utils/currency';
import { chartBlueRed, CHART_BLUE, CHART_ANIMATION_MS } from '../charts';

type PaymentsChartsProps = {
  paymentChartData: Array<{ month: string; amount: number }>;
  paymentMethodData: Array<{ name: string; value: number }>;
};

export default function PaymentsCharts({
  paymentChartData,
  paymentMethodData,
}: PaymentsChartsProps) {
  if (paymentChartData.length === 0 && paymentMethodData.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {paymentChartData.length > 0 && (
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <FiTrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            Évolution des paiements
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={paymentChartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value) => formatFCFA(Number(value ?? 0))} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke={CHART_BLUE}
                strokeWidth={2}
                dot={{ r: 4 }}
                isAnimationActive
                animationDuration={CHART_ANIMATION_MS}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {paymentMethodData.length > 0 && (
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <FiCreditCard className="w-5 h-5 mr-2 text-purple-600" />
            Méthodes de paiement
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={paymentMethodData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                isAnimationActive
                animationDuration={CHART_ANIMATION_MS}
              >
                {paymentMethodData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={chartBlueRed(index)} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
