"use client";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export interface AttendancePoint { name: string; atendimentos: number; }

export default function DashboardChart({ data }: { data: AttendancePoint[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: -10 }}>
          <defs>
            <linearGradient id="colorAtend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="name" stroke="#3d5554" tick={{ fill: "#6b8e8a", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis stroke="#3d5554" tick={{ fill: "#6b8e8a", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(8,15,9,0.95)",
              borderColor: "rgba(20,184,166,0.2)",
              borderRadius: "12px",
              color: "#fff",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
              backdropFilter: "blur(16px)",
            }}
            itemStyle={{ color: "#2dd4bf", fontWeight: 700 }}
            labelStyle={{ color: "#6b8e8a", fontSize: 11 }}
          />
          <Area
            type="monotone"
            dataKey="atendimentos"
            stroke="#14b8a6"
            strokeWidth={2.5}
            fill="url(#colorAtend)"
            dot={{ fill: "#020d0d", stroke: "#14b8a6", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: "#14b8a6", stroke: "#fff", strokeWidth: 2 }}
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
