const fs = require("fs");
const path = "c:/Users/HIMANSHU/Desktop/RA_SEBI/frontend/src/app/admin/page.tsx";
let content = fs.readFileSync(path, "utf8");

// 1. Add isImpersonated and handleReturnToSuperAdmin
const isImpersonatedStr = `  const [user, setUser] = useState<any>({ firstName: '', email: '', role: '' });
  const isImpersonated = user?.isImpersonated === true;`;
content = content.replace(`  const [user, setUser] = useState<any>({ firstName: '', email: '', role: '' });`, isImpersonatedStr);

const handleLogoutStr = `  const handleLogout = () => {`;
const returnToSuperAdminStr = `  const handleReturnToSuperAdmin = () => {
    const saToken = localStorage.getItem('superAdminToken');
    const saUser = localStorage.getItem('superAdminUser');
    if (saToken && saUser) {
      localStorage.setItem('accessToken', saToken);
      localStorage.setItem('token', saToken);
      localStorage.setItem('user', saUser);
      localStorage.removeItem('superAdminToken');
      localStorage.removeItem('superAdminUser');
      router.push('/super-admin');
    } else {
      router.push('/login');
    }
  };

  const handleLogout = () => {`;
content = content.replace(handleLogoutStr, returnToSuperAdminStr);

const logoutButtonStr = `          <button
            onClick={handleLogout}`;
const returnButtonStr = `          {isImpersonated && (
            <button
              onClick={handleReturnToSuperAdmin}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-500 transition shadow-lg shadow-red-500/20 mb-3"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Return to Super Admin</span>
            </button>
          )}
          <button
            onClick={handleLogout}`;
content = content.replace(logoutButtonStr, returnButtonStr);

// 2. Hide Roles & Permissions Tab
const navMapStr = `{NAV_CONFIG.map((mod) => {
              if (!hasPermission(mod.accessKey)) return null;`;
const navMapReplStr = `{NAV_CONFIG.map((mod) => {
              if (mod.tab === 'roles' && isImpersonated) return null;
              if (!hasPermission(mod.accessKey)) return null;`;
content = content.replace(navMapStr, navMapReplStr);

// 3. Hide Add/Create Buttons
content = content.replace(
  `{(!isStaff || hasPermission('CREATE_CLIENTS')) && (`,
  `{!isImpersonated && (!isStaff || hasPermission('CREATE_CLIENTS')) && (`
);

content = content.replace(
  `{(!isStaff || hasPermission('CREATE_PLANS')) && (\n                    <button onClick={() => setIsCategoryModalOpen(true)}`,
  `{!isImpersonated && (!isStaff || hasPermission('CREATE_PLANS')) && (\n                    <button onClick={() => setIsCategoryModalOpen(true)}`
);

content = content.replace(
  `{(!isStaff || hasPermission('CREATE_PLANS')) && (\n                    <button onClick={() => { setEditingPlan(null);`,
  `{!isImpersonated && (!isStaff || hasPermission('CREATE_PLANS')) && (\n                    <button onClick={() => { setEditingPlan(null);`
);

// Register Staff Button
const registerStaffRegex = /<button[\s\S]*?onClick=\{\(\) => \{\s*resetStaffForm\(\);\s*setIsStaffModalOpen\(true\);\s*\}\}[\s\S]*?<Plus className="h-4 w-4" \/>\s*<span>Register Staff<\/span>\s*<\/button>/;
const matchStaff = content.match(registerStaffRegex);
if (matchStaff) {
  content = content.replace(matchStaff[0], `{!isImpersonated && (\n${matchStaff[0]}\n)}`);
}

// Custom Role Button
const customRoleRegex = /\{hasPermission\('ACCESS_ROLES'\) && \([\s\S]*?<Plus className="h-3 w-3 mr-1" \/> Custom Role[\s\S]*?<\/button>\s*\)\}/;
const matchRole = content.match(customRoleRegex);
if (matchRole) {
  content = content.replace(matchRole[0], matchRole[0].replace(`{hasPermission`, `{!isImpersonated && hasPermission`));
}

// 4. Hide Actions column in Tables
// Match <th ...>Action(s)</th> or <th ...>Actions</th>
content = content.replace(/<th([^>]*)>Actions?<\/th>/gi, "{!isImpersonated && <th$1>Actions</th>}");

// For Actions <td>s, we can find <td className="... text-right space-x-2"> or <td ... text-center"> for Action
// Let's replace the td that corresponds to Actions.
// 1. Staff table: <td className="py-4 px-6 text-right space-x-2"> (lines around 2157)
// 2. SignalManagement: Not in page.tsx! Wait, is SignalManagement in page.tsx? Line 2678 has `<td className="py-4 px-6 text-right space-x-2">` but it's Payment verification! Oh, "Approve & Activate". Payments table!
// 3. Compliance tables: `<td className="py-3 px-5 text-center">`
// Let's just wrap any <td> containing action buttons.
// Actually, it's easier to find `<td ...>` followed by action buttons like `<button ...` and wrap it.
// Instead of risky regex, let's wrap `<td className="py-4 px-6 text-right space-x-2">`
// There are multiple. Let's do a replace with a replacer function for TDs that contain "Actions".
// Actually, all `<td ` containing `text-right space-x-2` or `text-center` with action buttons.
const tdRegex = /<td className="[^"]*(text-right space-x-2|text-center|text-right)"[^>]*>[\s\S]*?<\/td>/g;
content = content.replace(tdRegex, (match) => {
  // Check if it's the actions td
  if (match.includes("Edit") || match.includes("Reject") || match.includes("Approve") || match.includes("Toggle Status") || match.includes("startEdit") || match.includes("handleDelete") || match.includes("Action") || match.includes("handleVerifyPayment") || match.includes("View Details") || match.includes("Review") || match.includes("Reply")) {
     // Wait, some right aligned tds might just be numbers. The above checks ensure it has buttons with specific text/handlers.
     if(match.includes("<button")) {
         return `{!isImpersonated && (\n${match}\n)}`;
     }
  }
  return match;
});

// 5. Hide Save Settings buttons
// <button onClick={handleSaveSettings} ...
const saveSettingsRegex = /<button onClick=\{handleSaveSettings\}[\s\S]*?Save Settings<\/button>/;
const matchSave = content.match(saveSettingsRegex);
if (matchSave) {
  content = content.replace(matchSave[0], `{!isImpersonated && (\n${matchSave[0]}\n)}`);
}

// 6. SignalManagement is an imported component (`import SignalManagement from '../../components/SignalManagement';`)
// We should check if we need to pass `isImpersonated` to it. The prompt says "In all tables across all tabs", so yes, we should pass `isImpersonated` to SignalManagement and then edit SignalManagement component too! Wait, the prompt says "in the Admin dashboard frontend file: c:\\Users\\HIMANSHU\\Desktop\\RA_SEBI\\frontend\\src\\app\\admin\\page.tsx" so I only need to modify `page.tsx`!

fs.writeFileSync(path, content);
console.log("Patch applied.");
