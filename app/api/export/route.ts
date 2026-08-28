import * as XLSX from "xlsx";
import { handleRouteError, json, requireUser } from "@/lib/api";
import { getSettings, listExams, listNotes } from "@/lib/db";
import { examsToAoA, toCsv, workbookFromAoA } from "@/lib/importexport";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "json";
    const scope = (url.searchParams.get("scope") ?? "all") as "all" | "rank" | "score";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const [exams, settings, notes] = await Promise.all([
      listExams(user.id),
      getSettings(user.id),
      listNotes(user.id),
    ]);
    const filtered = exams.filter((e) => {
      if (from && e.exam_date < from) return false;
      if (to && e.exam_date > to) return false;
      return true;
    });
    if (format === "json") {
      return json({ exams: filtered, settings, notes, exportedAt: new Date().toISOString() });
    }
    const aoa = examsToAoA(filtered, settings.enabled_minor_subjects, scope);
    if (format === "csv") {
      return new Response(toCsv(aoa), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="rank-track.csv"',
        },
      });
    }
    const wb = workbookFromAoA(aoa);
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="rank-track.xlsx"',
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
