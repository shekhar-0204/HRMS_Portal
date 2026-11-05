# Graapes HRMS Portal — Frontend Application

Production-quality, enterprise-grade HRMS (Human Resource Management System) frontend built for **Graapes Private Limited**, developed strictly in accordance with **Graapes_HRMS_BRD_v1.0.pdf** and the Master Architecture Specifications.

---

## 1. Quick Start & Setup

### Requirements
- Node.js `v20.x` or higher
- npm `v10.x` or higher

### Installation
```bash
# Clone the repository and navigate to root
cd HRMS

# Install dependencies
npm install

# Run the local development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build & Verification
```bash
# Compile and verify static generation + TypeScript typing
npm run build

# Start production server
npm run start
```

---

## 2. Interactive Role Switcher (Development-Only)

In the desktop & mobile sidebar, an interactive **Role Preview Switcher** allows instant preview of the four primary roles without needing a real server auth system:
1. **Super Admin** (`superadmin@graapes.com`) — Complete access: Users, Roles, Audit Logs, Settings.
2. **HR Admin** (`hr.admin@graapes.com`) — Employee lifecycle, policies, documents, company-wide leave & attendance approvals.
3. **Department Manager** (`manager.eng@graapes.com`) — Engineering team roster, direct reports attendance, leave approval queue, punch adjustments.
4. **Employee / Intern** (`rohit.mehta@graapes.com`) — Self-Service: My Attendance, Web Check-in/out, Leave applications & balances, documents, holiday calendar.

*Note: Role switching in the UI is purely presentation-layer mock session state. Authoritative access controls and permissions must be verified and enforced by the backend API.*

---

## 3. Completed Modules & Route Sitemap

| Route | Module Name | BRD Reference | Primary Roles |
| :--- | :--- | :--- | :--- |
| `/login` | Authentication Portal | FR-001 | All Roles |
| `/dashboard` | Executive & ESS Dashboards | FR-018 | All Roles (Dynamic widgets) |
| `/employees` | Employee Directory & Lifecycle | FR-003, FR-004, FR-006 | Super Admin, HR, Manager |
| `/organization` | Departments, Designations & Hierarchy | FR-005 | Super Admin, HR Admin |
| `/attendance` | Punches, Exceptions & Corrections | FR-008, FR-009, FR-010 | All Roles |
| `/leave` | Balances, Applications & Approval Queue | FR-011, FR-012, FR-013, FR-014 | All Roles |
| `/holidays` | Company Holiday Calendar | FR-015 | All Roles |
| `/documents` | Verified Document Repository | FR-007 | All Roles |
| `/announcements` | Company Broadcasts & Notices | FR-016 | All Roles |
| `/reports` | HR Operational Reports & CSV Export | FR-020 | Super Admin, HR, Manager |
| `/users` | User Accounts & Role Assignment | FR-002 | Super Admin |
| `/roles` | Security & RBAC Matrix | FR-002, AC-01 | Super Admin |
| `/audit-logs` | Compliance Audit Trail | FR-021 | Super Admin, HR Admin |
| `/profile` | My Profile & Information | FR-003, BR-003 | All Roles |
| `/settings` | System Localization & Preferences | BR-009, OQ-04, OQ-09 | Super Admin, HR Admin |

---

## 4. Key Business Rules (BRD Implementation)

- **BR-001 & BR-004**: Unique Employee ID enforced (`GRP-xxx`) with duplicate detection validation in forms.
- **BR-003**: Protected employment fields (Designation, Department, Manager) remain read-only for employees; contact details remain editable.
- **BR-005**: Self-approval prevention implemented in workflow logic.
- **BR-006 & BR-007**: Deactivated users lose active sign-in access while their historical attendance, leave, and audit trail records are retained.
- **BR-008**: Export controls ensure sensitive data (salaries, bank records) are never included in exported files.
- **BR-009**: Default corporate timezone: `Asia/Kolkata` (IST).
- **BR-010**: Conditional modules (Payroll, Recruitment, Performance) remain locked and disabled in Phase 1 Core Scope.

---

## 5. Backend Integration Contracts

Backend developers can replace mock state hooks with real REST/GraphQL APIs by implementing the interfaces defined in:
`src/lib/api/contracts.ts`

- `IEmployeeService`
- `IAttendanceService`
- `ILeaveService`
- `IOrganizationService`
- `IDocumentService`
- `IAuditService`
