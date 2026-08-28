import { DataGrid } from "@/components/data-grid";
import { ImportPanel } from "@/components/import-panel";
import { PageTransition } from "@/components/page-transition";
import { getSettings, listExams } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DataPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [exams, settings] = await Promise.all([listExams(user.id), getSettings(user.id)]);
  return (
    <PageTransition>
      <div className="stack">
        <div className="page-head">
          <div>
            <h1>数据表格</h1>
            <p className="muted">点击单元格编辑，失焦自动保存，支持粘贴</p>
          </div>
        </div>
        <section className="card">
          <h3>Excel / CSV 导入</h3>
          <ImportPanel />
        </section>
        <section className="card">
          <DataGrid exams={exams} settings={settings} />
        </section>
      </div>
    </PageTransition>
  );
}
