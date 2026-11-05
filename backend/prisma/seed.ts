import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";
import "dotenv/config";

const prisma = new PrismaClient();
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

async function main() {
  const password = process.env.SEED_DEFAULT_PASSWORD ?? "ChangeMe@12345";
  const passwordHash = await bcrypt.hash(password, 12);

  // Departments
  const deptRows = [
    ["ENG", "Engineering & Technology", "Software development, architecture, cloud infrastructure, and technical design."],
    ["HR", "Human Resources", "People operations, talent acquisition, culture, compliance, and employee lifecycle."],
    ["PROD", "Product & UX Design", "Product strategy, user experience research, UI architecture, and feature roadmaps."],
    ["FIN", "Finance & Accounting", "Financial governance, budgeting, audit compliance, and accounting records."],
    ["OPS", "Operations & Admin", "Facility operations, procurement, IT assets, and administrative logistics."],
  ] as const;
  const dept: Record<string, string> = {};
  for (const [code, name, description] of deptRows) {
    dept[code] = (await prisma.department.upsert({ where: { code }, update: {}, create: { code, name, description } })).id;
  }

  // Designations
  const desRows = [
    ["ENG", "Chief Technology & Operations Officer", "L7 - C-Level"],
    ["ENG", "Engineering Director", "L6 - Executive"],
    ["HR", "Lead HR Manager", "L5 - Management"],
    ["ENG", "Principal Architect", "L5 - Lead"],
    ["ENG", "Senior Fullstack Engineer", "L4 - Senior"],
    ["ENG", "Frontend Engineer", "L3 - Mid"],
    ["ENG", "Software Engineer Intern", "L1 - Intern"],
    ["PROD", "Product Designer", "L3 - Mid"],
    ["HR", "HR Operations Executive", "L2 - Associate"],
    ["FIN", "Finance Associate", "L2 - Associate"],
  ] as const;
  const des: Record<string, string> = {};
  for (const [dc, title, level] of desRows) {
    des[title] = (await prisma.designation.upsert({
      where: { departmentId_title: { departmentId: dept[dc], title } }, update: {}, create: { departmentId: dept[dc], title, level },
    })).id;
  }

  // Leave types
  const lts = [
    ["CL", "Casual Leave", "Personal commitments, family emergencies and unplanned errands.", 12, null, "emerald"],
    ["SL", "Sick Leave", "Medical ailments, health checkups and recuperation.", 10, 2, "amber"],
    ["PL", "Earned / Privilege Leave", "Planned vacations and extended leaves accrued monthly.", 15, null, "blue"],
    ["COMP", "Compensatory Off", "Granted against approved extra work on designated holidays/weekends.", 5, null, "purple"],
    ["UNPAID", "Loss of Pay (LWP)", "Unpaid leave taken when standard quotas are exhausted.", 0, null, "rose"],
  ] as const;
  for (const [code, name, description, quota, proof, color] of lts)
    await prisma.leaveType.upsert({ where: { code }, update: {}, create: { code, name, description, defaultAnnualQuota: quota, requiresProofAfterDays: proof, color } });

  // Employees + login accounts (hierarchy: GRP-001 -> GRP-002, GRP-003 -> GRP-014)
  type Seed = { code: string; name: string; email: string; role: UserRole; dept: string; title: string; type: string; join: string; phone: string; gender: string; mgr?: string };
  const people: Seed[] = [
    { code: "GRP-001", name: "Vikram Malhotra", email: "superadmin@graapes.com", role: "super_admin", dept: "ENG", title: "Chief Technology & Operations Officer", type: "Full-Time", join: "2023-01-15", phone: "+91 98200 11223", gender: "Male" },
    { code: "GRP-002", name: "Pooja Sharma", email: "hr.admin@graapes.com", role: "hr_admin", dept: "HR", title: "Lead HR Manager", type: "Full-Time", join: "2023-03-01", phone: "+91 98110 33445", gender: "Female", mgr: "GRP-001" },
    { code: "GRP-003", name: "Arjun Verma", email: "manager.eng@graapes.com", role: "department_manager", dept: "ENG", title: "Engineering Director", type: "Full-Time", join: "2023-04-10", phone: "+91 98450 77889", gender: "Male", mgr: "GRP-001" },
    { code: "GRP-014", name: "Rohit Mehta", email: "rohit.mehta@graapes.com", role: "employee", dept: "ENG", title: "Frontend Engineer", type: "Full-Time", join: "2024-06-03", phone: "+91 98765 43210", gender: "Male", mgr: "GRP-003" },
  ];
  const empId: Record<string, string> = {};
  for (const p of people) {
    const e = await prisma.employee.upsert({
      where: { employeeCode: p.code }, update: {},
      create: {
        employeeCode: p.code, fullName: p.name, workEmail: p.email, phone: p.phone, gender: p.gender,
        joiningDate: d(p.join), employmentType: p.type, status: "Active", workLocation: "Bangalore HQ",
        departmentId: dept[p.dept], designationId: des[p.title],
        reportingManagerId: p.mgr ? empId[p.mgr] : undefined,
      },
    });
    empId[p.code] = e.id;
    const u = await prisma.user.upsert({
      where: { email: p.email }, update: {},
      create: { email: p.email, passwordHash, role: p.role, employeeId: e.id },
    });
    await prisma.userPreference.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id } });
  }

  // Department heads
  await prisma.department.update({ where: { code: "ENG" }, data: { headEmployeeId: empId["GRP-003"] } });
  await prisma.department.update({ where: { code: "HR" }, data: { headEmployeeId: empId["GRP-002"] } });

  console.log(`Seed complete. Accounts use the SEED_DEFAULT_PASSWORD value — change it after first login.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
