import * as XLSX from "xlsx";
import { handleRouteError, requireUser } from "@/lib/api";
import { getSettings } from "@/lib/db";
import { buildTemplateWorkbook } from "@/lib/importexport";

export async function GET() {
  try {
    const user = await requireUser();
    const settings = await getSettings(user.id);
    const wb = buildTemplateWorkbook(settings.enabled_minor_subjects);
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="rank-track-template.xlsx"',
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
