import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  description,
  color = "text-flight-blue",
  bgColor = "bg-flight-blue/5",
  borderColor = "border-flight-blue/20",
  className = ""
}) {
  return (
    <Card className={`${borderColor ? `border ${borderColor}` : ''} shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden ${bgColor} ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${bgColor === 'bg-gray-50' ? 'bg-gray-100' : bgColor}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className={`text-2xl font-bold mb-1 ${trend === 'down' ? 'text-red-600' : 'text-gray-900'}`}>
          {value}
        </div>
        {trend && trendValue && (
          <div className="flex items-center space-x-2 text-xs">
            {trend === "up" && (
              <>
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-green-600">+{trendValue}</span>
              </>
            )}
            {trend === "down" && (
              <>
                <TrendingDown className="h-3 w-3 text-red-600" />
                <span className="text-red-600">-{trendValue}</span>
              </>
            )}
            {trend === "neutral" && (
              <span className="text-gray-500">{trendValue}</span>
            )}
          </div>
        )}
        {description && (
          <p className="text-xs text-gray-600 mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
