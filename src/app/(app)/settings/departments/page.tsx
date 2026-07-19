import { redirect } from "next/navigation";

// Departamentos migrou para uma aba dentro de Equipe (/settings/team).
// Mantemos a rota para não quebrar links existentes (ex.: Tabulações),
// redirecionando para a aba correspondente.
export default function DepartmentsPage() {
  redirect("/settings/team?tab=departamentos");
}
