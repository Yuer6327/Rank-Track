import { NotesList } from "@/components/notes-list";
import { listExams, listNotes } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ examId?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { examId } = await searchParams;
  const [notes, exams] = await Promise.all([listNotes(user.id), listExams(user.id)]);
  return (
    <div className="stack">
      <div className="page-head">
        <h1>回顾笔记</h1>
      </div>
      <NotesList notes={notes} exams={exams} presetExamId={examId} />
    </div>
  );
}
