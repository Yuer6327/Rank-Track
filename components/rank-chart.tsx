"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Exam, RankDimension, Settings } from "@/lib/types";
import { examLabel, percentOf } from "@/lib/utils";

function totalOf(exam: Exam, dim: RankDimension) {
  if (dim === "class") return exam.total_class_rank;
  if (dim === "city") return exam.total_city_rank;
  return exam.total_grade_rank;
}

export function RankChart({
  exams,
  settings,
  highlightId,
  compact,
}: {
  exams: Exam[];
  settings: Settings;
  highlightId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [dim, setDim] = useState<RankDimension>(
    settings.trend_chart_default_dimension === "class_rank"
      ? "class"
      : settings.trend_chart_default_dimension === "city_rank"
        ? "city"
        : "grade",
  );
  const [showGoal, setShowGoal] = useState(settings.trend_chart_show_goal_line);
  const [showLabel, setShowLabel] = useState(settings.trend_chart_show_data_labels);
  const [xMode, setXMode] = useState(settings.trend_chart_x_axis);
  const [dual, setDual] = useState(settings.trend_chart_dual_axis);
  const [count, setCount] = useState(settings.trend_chart_show_count);

  const goal =
    dim === "class"
      ? settings.long_term_goals.total_class_rank
      : dim === "city"
        ? settings.long_term_goals.total_city_rank
        : settings.long_term_goals.total_grade_rank;
  const total =
    dim === "class"
      ? settings.total_students.class
      : dim === "city"
        ? settings.total_students.city
        : settings.total_students.grade;

  const data = useMemo(() => {
    const sliced = count > 0 ? exams.slice(-count) : exams;
    return sliced.map((e) => {
      const rank = totalOf(e, dim);
      return {
        id: e.id,
        label: examLabel(e.exam_name, e.exam_date, xMode),
        rank,
        percent: percentOf(rank, total ?? null),
        hl: e.id === highlightId,
      };
    });
  }, [exams, dim, xMode, count, total, highlightId]);

  return (
    <div>
      {!compact ? (
        <div className="row" style={{ marginBottom: 10 }}>
          {(["grade", "class", "city"] as RankDimension[]).map((d) => (
            <button key={d} className={`btn ${dim === d ? "primary" : ""}`} type="button" onClick={() => setDim(d)}>
              {d === "grade" ? "年级" : d === "class" ? "班级" : "全市"}
            </button>
          ))}
          <button className="btn" type="button" onClick={() => setShowGoal((v) => !v)}>
            目标线 {showGoal ? "开" : "关"}
          </button>
          <button className="btn" type="button" onClick={() => setShowLabel((v) => !v)}>
            标注 {showLabel ? "开" : "关"}
          </button>
          <button className="btn" type="button" onClick={() => setXMode((v) => (v === "date" ? "name_date" : "date"))}>
            X 轴：{xMode === "date" ? "日期" : "名称+日期"}
          </button>
          <button className="btn" type="button" onClick={() => setDual((v) => !v)}>
            百分比 {dual ? "同图" : "关"}
          </button>
          <select className="select" style={{ width: 120 }} value={count} onChange={(e) => setCount(Number(e.target.value))}>
            <option value={5}>最近 5 次</option>
            <option value={10}>最近 10 次</option>
            <option value={0}>全部</option>
          </select>
        </div>
      ) : null}
      <div style={{ width: "100%", height: compact ? 180 : 320 }}>
        <ResponsiveContainer>
          <LineChart
            data={data}
            onClick={(state) => {
              const payload = state as { activePayload?: { payload?: { id?: string } }[] };
              const id = payload.activePayload?.[0]?.payload?.id;
              if (id) router.push(`/exam/${id}`);
            }}
          >
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: "var(--fg-3)", fontSize: 12 }} />
            <YAxis
              yAxisId="rank"
              reversed
              tick={{ fill: "var(--fg-3)", fontSize: 12 }}
              allowDecimals={false}
            />
            {dual ? (
              <YAxis
                yAxisId="pct"
                orientation="right"
                tick={{ fill: "var(--fg-4)", fontSize: 12 }}
                unit="%"
              />
            ) : null}
            <Tooltip
              contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--line)", borderRadius: 12 }}
            />
            <Legend />
            {showGoal && goal != null ? (
              <ReferenceLine yAxisId="rank" y={goal} stroke="var(--fg-4)" strokeDasharray="6 6" label="目标" />
            ) : null}
            <Line
              yAxisId="rank"
              type="monotone"
              dataKey="rank"
              name="排名"
              stroke="var(--fg)"
              strokeWidth={2}
              dot={{ r: 4 }}
              connectNulls
            >
              {showLabel ? <LabelList dataKey="rank" position="top" /> : null}
            </Line>
            {dual ? (
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="percent"
                name="百分比"
                stroke="var(--fg-4)"
                strokeDasharray="4 4"
                connectNulls
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
