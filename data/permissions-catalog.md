# CIPP Permissions Catalog

> Generated 2026-07-14T06:11:32.711Z from CIPP 10.6.0 (`6138cf5de`) + CIPP-API 10.6.0 (`fd23ff2`).

Each entry is a `Category.Object` permission pair, assignable as `.Read` (view) or `.ReadWrite` (view + act) when building custom roles. Backend function lists come from the CIPP-API repo's per-function permission declarations; the cross-check compares frontend UI gating against actual backend enforcement.

**Enforcement semantics** (from `Test-CIPPAccess.ps1`): matching is case-insensitive and `ReadWrite` implies `Read`. Nav permissions describe **visibility, not capability** - a role needs the union of the backend roles its pages' endpoints declare.

## Summary

- 54 permission pairs across 9 categories
- 6 × Not cross-checked (baseline permission or no checkable surface)
- 3 × Not cross-checked (no nav/component gate to verify)
- 22 × MISMATCHES FOUND - see table below
- 23 × Consistent - frontend gating matches backend enforcement
- 52 total frontend/backend mismatches (aggregated table at the bottom)
- 11 backend-only permissions with no frontend UI surface (listed at the bottom)

## CIPP

### CIPP.AppSettings

Global CIPP application configuration: Application Settings, Setup Wizard, Custom Data fields, and SSO configuration dialogs.

- **Nav sections:** CIPP > Application Settings | CIPP > Setup Wizard | CIPP > Custom Data
- **Cross-check:** Not cross-checked (baseline permission or no checkable surface)
- **Backend functions unlocked at Read:** ExecAccessChecks, ExecBackendURLs, ExecGDAPTrace, ExecMaintenanceScripts, ListExcludedLicenses, ListNotificationConfig
- **Backend functions unlocked at ReadWrite:** ExecAddTenant, ExecAddTrustedIP, ExecBackupReplicationConfig, ExecBackupRetentionConfig, ExecBrandingSettings, ExecCPVPermissions, ExecCippLogsSas, ExecCombinedSetup, ExecCreateSAMApp, ExecCustomData, ExecDeviceCodeLogon, ExecDurableFunctions, ExecExchangeRoleRepair, ExecExcludeLicenses, ExecExcludeTenant, ExecFeatureFlag, ExecJITAdminSettings, ExecLogRetentionConfig, ExecNotificationConfig, ExecPartnerWebhook, ExecPasswordConfig, ExecPermissionRepair, ExecRestoreBackup, ExecRunBackup, ExecSAMCertificate, ExecSSOSetup, ExecTokenExchange, ExecUpdateRefreshToken

### CIPP.Backup

Backup and restore of tenant configuration/standards data (Tenant Administration > Backup).

- **Nav sections:** Tenant Administration
- **Cross-check:** Not cross-checked (no nav/component gate to verify)
- **Backend functions unlocked at Read:** ExecListBackup
- **Backend functions unlocked at ReadWrite:** ExecSetCIPPAutoBackup

### CIPP.Core

Baseline CIPP functionality: Dashboard, IP Database, Dark Web breach lookups, Report Builder, Template Library, Community Repositories, and the Logbook (audit trail of CIPP actions). Treated as the app's floor permission - the role editor forces this to at least Read and won't let it be set to None.

- **Nav sections:** Dashboard | Tools > Tenant Tools > IP Database | Tools > Dark Web Tools | Tools > Dark Web Tools > Tenant Breach Lookup | Tools > Dark Web Tools > Breach Lookup | Tools > Report Builder | Tools > Template Library | Tools > Community Repositories | CIPP > Logbook
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ExecBreachSearch, ExecGeoIPLookup, ExecGraphExplorerPreset, ExecGraphRequestProfile, ExecLicenseSearch, ExecMailTest, ExecMcp, ExecUniversalSearch, ExecUniversalSearchV2, GetCippAlerts, GetVersion, ListAdminPortalLicenses, ListApiTest, ListBreachesAccount, ListBreachesTenant, ListCheckExtAlerts, ListCippQueue, ListCommunityRepos, ListCustomDataMappings, ListCustomRole, ListCustomVariables, ListDBCache, ListDirectoryObjects, ListExoRequest, ListExtensionCacheData, ListExternalTenantInfo, ListFeatureFlags, ListFunctionParameters, ListFunctionStats, ListGeneratedReports, ListGenericTestFunction, ListGitHubReleaseNotes, ListGraphBulkRequest, ListGraphExplorerPresets, ListGraphRequest, ListIPWhitelist, ListKnownIPDb, ListLogs, ListOrg, ListReportBuilderTemplates, ListSharepointAdminUrl, ListTenantDetails, ListTenantGroups, ListTenants, invoke-ListEmptyResults
- **Backend functions unlocked at ReadWrite:** ExecCIPPDBCache, ExecCPVRefresh, ExecCloneTemplate, ExecCommunityRepo, ExecEditTemplate, ExecGenerateReportBuilderReport, ExecListAppId, ExecReportBuilderTemplate, ExecSetPackageTag, ExecUserBookmarks, ExecUserSettings, RemoveCippQueue

**Mismatches (1):** UI element gated by `CIPP.Core.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /tenant/tools/geoiplookup (`src/pages/tenant/tools/geoiplookup/index.js:33`) | ExecAddTrustedIP | action | `CIPP.AppSettings.ReadWrite` |

### CIPP.Extension

Third-party integration configuration (CIPP > Integrations) - PSA/RMM/webhook connectors and similar extensions.

- **Nav sections:** CIPP > Integrations
- **Cross-check:** Not cross-checked (baseline permission or no checkable surface)
- **Backend functions unlocked at Read:** ExecExtensionTest, ListExtensionSync, ListExtensionsConfig, ListHaloClients
- **Backend functions unlocked at ReadWrite:** ExecApiClient, ExecExtensionClearHIBPKey, ExecExtensionMapping, ExecExtensionNinjaOneQueue, ExecExtensionSync, ExecExtensionsConfig, ExecGitHubAction

### CIPP.Scheduler

CIPP's own task scheduler (Tools > Scheduler) - creating, viewing, and managing scheduled automation jobs.

- **Nav sections:** Tools | Tools > Scheduler
- **Cross-check:** Not cross-checked (baseline permission or no checkable surface)
- **Backend functions unlocked at Read:** ListScheduledItemDetails, ListScheduledItems
- **Backend functions unlocked at ReadWrite:** AddScheduledItem, RemoveScheduledItem

### CIPP.SuperAdmin

Highest-privilege CIPP internals: Super Admin tools, raw Exchange cmdlet execution, background timers, table maintenance, diagnostics, container logs, worker health. Should be reserved for top-tier admins - this is the operational/infrastructure layer of CIPP itself, not tenant management.

- **Nav sections:** CIPP > Advanced | CIPP > Advanced > Super Admin | CIPP > Advanced > Exchange Cmdlets | CIPP > Advanced > Timers | CIPP > Advanced > Table Maintenance | CIPP > Advanced > Diagnostics | CIPP > Advanced > Container Logs | CIPP > Advanced > Worker Health
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ExecAPIPermissionList, ExecAppInsightsQuery, ListCIPPUsers, ListContainerLogs, ListDiagnosticsPresets, ListWorkerHealth
- **Backend functions unlocked at ReadWrite:** ExecAzBobbyTables, ExecCIPPUsers, ExecCippFunction, ExecContainerManagement, ExecCustomRole, ExecDiagnosticsPresets, ExecOffloadFunctions, ExecPartnerMode, ExecSAMAppPermissions, ExecSAMRoles, ExecTimeSettings

### CIPP.Tests

Custom Tests tool (Tools > Custom Tests) - user-defined validation/test scripts run against tenants.

- **Nav sections:** Tools > Custom Tests
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListCustomScripts
- **Backend functions unlocked at ReadWrite:** AddCustomScript, ExecCustomScript, RemoveCustomScript

## Endpoint

### Endpoint.Application

Intune application deployment: Applications list, Application Queue, Application Templates.

- **Nav sections:** Intune | Intune > Applications | Intune > Applications > Applications | Intune > Applications > Application Queue | Intune > Applications > Application Templates
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListAppTemplates, ListApplicationQueue, ListApps, ListAppsRepository, ListPotentialApps
- **Backend functions unlocked at ReadWrite:** AddAppTemplate, AddChocoApp, AddMSPApp, AddOfficeApp, AddStoreApp, AddWin32ScriptApp, ExecAppUpload, ExecAssignApp, ExecDeployAppTemplate, ExecSyncVPP, RemoveApp, RemoveAppTemplate, RemoveQueuedApp

### Endpoint.Autopilot

Windows Autopilot & enrollment: Autopilot devices, adding devices, enrollment profiles, status pages, and Autopilot deployment reports. One pairing quirk: on the Enrollment Profiles page, the remove-profile and DEP-sync actions run under Endpoint.MEM.ReadWrite, so an Autopilot-only role can view profiles but those two buttons fail - pair with Endpoint.MEM.ReadWrite for full enrollment-profile management.

- **Nav sections:** Intune | Intune > Autopilot & Enrollment | Intune > Autopilot & Enrollment > Autopilot Devices | Intune > Autopilot & Enrollment > Add Autopilot Device | Intune > Autopilot & Enrollment > Enrollment Profiles | Intune > Autopilot & Enrollment > Status Pages | Intune > Reports | Intune > Reports > Autopilot Deployments
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ListAPDevices, ListAndroidEnrollmentProfiles, ListAppleEnrollmentProfiles, ListAutopilotconfig
- **Backend functions unlocked at ReadWrite:** AddAPDevice, AddAutopilotConfig, AddEnrollment, ExecAssignAPDevice, ExecRenameAPDevice, ExecSetAPDeviceGroupTag, ExecSyncAPDevices, RemoveAPDevice, RemoveAutopilotConfig

**Mismatches (2):** UI element gated by `Endpoint.Autopilot.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /endpoint/autopilot/enrollment-profiles (`src/pages/endpoint/autopilot/enrollment-profiles/index.js:249`) | ExecRemoveEnrollmentProfile | action | `Endpoint.MEM.ReadWrite` |
| /endpoint/autopilot/enrollment-profiles (`src/pages/endpoint/autopilot/enrollment-profiles/index.js:345`) | ExecSyncDEP | action | `Endpoint.MEM.ReadWrite` |

### Endpoint.Device

Intune-managed device inventory and reporting: Devices list, Analytics Device Score, Work from Anywhere report. (Distinct from Identity.Device, which is Entra's device registration record, not Intune management.)

- **Nav sections:** Intune | Intune > Device Management > Devices | Intune > Reports | Intune > Reports > Analytics Device Score | Intune > Reports > Work from anywhere
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ExecBitlockerSearch, ExecGetLocalAdminPassword, ExecGetRecoveryKey, ListAppStatus, ListDevices

**Mismatches (1):** UI element gated by `Endpoint.Device.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /endpoint/MEM/devices (`src/pages/endpoint/MEM/devices/index.js:63`) | ExecSyncDEP | action | `Endpoint.MEM.ReadWrite` |

### Endpoint.MEM

Intune policy management broadly: Configuration/Compliance/App Protection policies, policy templates, reusable settings (+ templates), assignment filters (+ templates), scripts, Discovered Apps report, and the Intune policy-compare tool. Also gates the Defender CVE Exceptions page, which is grouped under Intune policy management in code despite living in the Security & Compliance nav section. Two pairing quirks: the template edit/clone/tag actions on the Templates page run under CIPP.Core.ReadWrite (above the CIPP.Core.Read floor every role holds), and the CVE exception add/remove actions run under Security.Alert.ReadWrite.

- **Nav sections:** Intune | Intune > Device Management | Intune > Device Management > Configuration Policies | Intune > Device Management > Compliance Policies | Intune > Device Management > App Policies | Intune > Device Management > Policy Templates | Intune > Device Management > Reusable Settings | Intune > Device Management > Reusable Settings Templates | Intune > Device Management > Assignment Filters | Intune > Device Management > Assignment Filter Templates | Intune > Device Management > Scripts | Intune > Reports | Intune > Reports > Discovered Apps | Tools | Tools > Intune Tools | Tools > Intune Tools > Compare Policies
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ExecCompareIntunePolicy, ListAppProtectionPolicies, ListAssignmentFilterTemplates, ListAssignmentFilters, ListCompliancePolicies, ListDefenderState, ListDefenderTVM, ListIntuneIntents, ListIntunePolicy, ListIntuneReusableSettingTemplates, ListIntuneReusableSettings, ListIntuneScript, ListIntuneTemplates
- **Backend functions unlocked at ReadWrite:** AddAssignmentFilter, AddAssignmentFilterTemplate, AddDefenderDeployment, AddDefenderTemplate, AddIntunePolicyClone, AddIntuneReusableSetting, AddIntuneReusableSettingTemplate, AddIntuneTemplate, AddPolicy, EditAssignmentFilter, EditIntunePolicy, EditIntuneScript, EditPolicy, ExecAssignPolicy, ExecAssignmentFilter, ExecDeviceAction, ExecDevicePasscodeAction, ExecRemoveEnrollmentProfile, ExecSyncDEP, RemoveAssignmentFilterTemplate, RemoveIntuneReusableSetting, RemoveIntuneReusableSettingTemplate, RemoveIntuneScript, RemoveIntuneTemplate, RemovePolicy

**Mismatches (5):** UI element gated by `Endpoint.MEM.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /endpoint/MEM/list-templates (`src/pages/endpoint/MEM/list-templates/index.js:45`) | ExecEditTemplate | action | `CIPP.Core.ReadWrite` |
| /endpoint/MEM/list-templates (`src/pages/endpoint/MEM/list-templates/index.js:72`) | ExecCloneTemplate | action | `CIPP.Core.ReadWrite` |
| /endpoint/MEM/list-templates (`src/pages/endpoint/MEM/list-templates/index.js:83`) | ExecSetPackageTag | action | `CIPP.Core.ReadWrite` |
| (file-level gate) (`src/pages/security/defender/defender-cve-exceptions/index.js:31`) | ExecAddCippCveException | action | `Security.Alert.ReadWrite` |
| (file-level gate) (`src/pages/security/defender/defender-cve-exceptions/index.js:83`) | ExecRemoveCippCveException | action | `Security.Alert.ReadWrite` |

## Exchange

### Exchange.ConnectionFilter

Spam filter connection filters and their templates.

- **Nav sections:** Email & Exchange | Email & Exchange > Spamfilter > Connection filter | Email & Exchange > Spamfilter > Connection filter templates
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListConnectionFilter, ListConnectionFilterTemplates
- **Backend functions unlocked at ReadWrite:** AddConnectionFilter, AddConnectionFilterTemplate, RemoveConnectionfilterTemplate

### Exchange.Connector

Exchange mail flow connectors and connector templates.

- **Nav sections:** Email & Exchange | Email & Exchange > Transport > Connectors | Email & Exchange > Transport > Connector Templates
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListExConnectorTemplates, ListExchangeConnectors
- **Backend functions unlocked at ReadWrite:** AddExConnector, AddExConnectorTemplate, EditExConnector, RemoveExConnector, RemoveExConnectorTemplate

### Exchange.Contact

Mail contacts and contact templates.

- **Nav sections:** Email & Exchange | Email & Exchange > Administration > Contacts | Email & Exchange > Administration > Contact Templates
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListContactTemplates, ListContacts
- **Backend functions unlocked at ReadWrite:** AddContact, AddContactTemplates, DeployContactTemplates, EditContact, EditContactTemplates, RemoveContact, RemoveContactTemplates

### Exchange.Equipment

Bookable equipment resource mailboxes.

- **Nav sections:** Email & Exchange | Email & Exchange > Resource Management | Email & Exchange > Resource Management > Equipment
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListEquipment
- **Backend functions unlocked at ReadWrite:** AddEquipmentMailbox, EditEquipmentMailbox

### Exchange.Group

Distribution/mail-enabled group reporting (Global Address List report). The GAL report's data call itself runs under Exchange.Mailbox.Read - grant that alongside, or the page renders but stays empty.

- **Nav sections:** Email & Exchange | Email & Exchange > Reports | Email & Exchange > Reports > Global Address List
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at ReadWrite:** ExecGroupsDeliveryManagement, ExecGroupsHideFromGAL

**Mismatches (1):** UI element gated by `Exchange.Group.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /email/reports/global-address-list (`src/pages/email/reports/global-address-list/index.js:69`) | ListGlobalAddressList | read | `Exchange.Mailbox.Read` |

### Exchange.Mailbox

Core mailbox administration: mailboxes, High Volume Email (HVE) accounts, deleted mailboxes, mailbox rules, restricted users; plus mailbox reports (statistics, activity, client access, permissions, calendar permissions, forwarding, shared-mailbox-with-enabled-account, ActiveSync devices) and email tools (message trace, message viewer, mailbox restores). One cross-permission quirk: the mailboxes page’s send-push action (ExecSendPush) runs under Identity.User.Read.

- **Nav sections:** Email & Exchange | Email & Exchange > Administration | Email & Exchange > Administration > Mailboxes | Email & Exchange > Administration > HVE Accounts | Email & Exchange > Administration > Deleted Mailboxes | Email & Exchange > Administration > Mailbox Rules | Email & Exchange > Administration > Restricted Users | Email & Exchange > Reports | Email & Exchange > Reports > Mailbox Statistics | Email & Exchange > Reports > Mailbox Activity | Email & Exchange > Reports > Mailbox Client Access Settings | Email & Exchange > Reports > Mailbox Permissions | Email & Exchange > Reports > Calendar Permissions | Email & Exchange > Reports > Mailbox Forwarding | Email & Exchange > Reports > Shared Mailbox with Enabled Account | Email & Exchange > Reports > ActiveSync Devices | Tools | Tools > Email Tools | Tools > Email Tools > Message Trace | Tools > Email Tools > Message Viewer | Tools > Email Tools > Mailbox Restores
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ListActiveSyncDevices, ListCalendarPermissions, ListContactPermissions, ListGlobalAddressList, ListHVEAccounts, ListMailboxCAS, ListMailboxForwarding, ListMailboxMobileDevices, ListMailboxRestores, ListMailboxRules, ListMailboxes, ListMessageTrace, ListOoO, ListRestrictedUsers, ListSharedMailboxAccountEnabled, ListSharedMailboxStatistics, ListUserMailboxDetails, ListUserMailboxRules, ListUserTrustedBlockedSenders, ListmailboxPermissions
- **Backend functions unlocked at ReadWrite:** AddSharedMailbox, ExecConvertMailbox, ExecCopyForSent, ExecEditCalendarPermissions, ExecEditMailboxPermissions, ExecEmailForward, ExecEnableArchive, ExecEnableAutoExpandingArchive, ExecGroupsDelete, ExecHVEUser, ExecHideFromGAL, ExecMailboxMobileDevices, ExecMailboxRestore, ExecModifyCalPerms, ExecModifyContactPerms, ExecModifyMBPerms, ExecRemoveMailboxRule, ExecRemoveRestrictedUser, ExecScheduleForwardingVacation, ExecScheduleMailboxVacation, ExecScheduleOOOVacation, ExecSetCASMailbox, ExecSetCalendarProcessing, ExecSetLitigationHold, ExecSetMailboxEmailSize, ExecSetMailboxLocale, ExecSetMailboxQuota, ExecSetMailboxRetentionPolicies, ExecSetMailboxRule, ExecSetOoO, ExecSetRecipientLimits, ExecSetRetentionHold, ExecStartManagedFolderAssistant, RemoveTrustedBlockedSender

**Mismatches (1):** UI element gated by `Exchange.Mailbox.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /email/administration/mailboxes (`src/pages/email/administration/mailboxes/index.js:161`) | ExecSendPush | action | `Identity.User.Read` |

### Exchange.RetentionPolicies

Exchange-level retention policies and retention tags (mailbox retention, not the Purview compliance retention policies - see Security.RetentionCompliancePolicy).

- **Nav sections:** Email & Exchange | Email & Exchange > Administration > Retention Policies & Tags
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at ReadWrite:** ExecManageRetentionPolicies, ExecManageRetentionTags

### Exchange.Room

Bookable room resource mailboxes and room lists.

- **Nav sections:** Email & Exchange | Email & Exchange > Resource Management > Rooms | Email & Exchange > Resource Management > Room Lists
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListRoomLists, ListRooms
- **Backend functions unlocked at ReadWrite:** AddRoomList, AddRoomMailbox, EditRoomList, EditRoomMailbox

### Exchange.SafeLinks

Safe Links policy template management: creating, editing, deleting templates and deploying policies from them. Note the split with its sibling permission: the Safe Links pages are made visible by Security.SafeLinksPolicy, but the template management work happens under this permission (and policy edit/delete under Exchange.SpamFilter) - for a role that fully manages Safe Links, grant all three together. The Safe Attachments filter report is separately backed by Exchange.SpamFilter functions.

- **Nav sections:** Email & Exchange | Email & Exchange > Reports | Email & Exchange > Reports > Safe Attachments Filters
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ListSafeLinksPolicyTemplateDetails, ListSafeLinksPolicyTemplates
- **Backend functions unlocked at ReadWrite:** AddSafeLinksPolicyFromTemplate, AddSafeLinksPolicyTemplate, CreateSafeLinksPolicyTemplate, EditSafeLinksPolicyTemplate, RemoveSafeLinksPolicyTemplate

**Mismatches (2):** UI element gated by `Exchange.SafeLinks.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /email/reports/safeattachments-filters (`src/pages/email/reports/safeattachments-filters/index.js:7`) | ListSafeAttachmentsFilters | read | `Exchange.SpamFilter.Read` |
| /email/reports/safeattachments-filters (`src/pages/email/reports/safeattachments-filters/index.js:15`) | EditSafeAttachmentsFilter | action | `Exchange.SpamFilter.ReadWrite` |

### Exchange.SpamFilter

Quarantine management, Tenant Allow/Block Lists (+ templates), spam filter policies/templates, quarantine policies, plus anti-phishing and malware filter reports. Also carries Safe Links policy edit/delete. Naming quirk: six write functions on these pages (spam filter template add/remove, quarantine policy add/edit/remove) declare the casing variant 'Exchange.Spamfilter'. Enforcement is case-insensitive, so Exchange.SpamFilter.ReadWrite still grants them - the only impact is that 'Exchange.Spamfilter' appears as a separate object in the role editor and permission listings until the backend .ROLE tags are aligned.

- **Nav sections:** Email & Exchange | Email & Exchange > Administration > Quarantine | Email & Exchange > Administration > Tenant Allow/Block Lists | Email & Exchange > Administration > Allow/Block List Templates | Email & Exchange > Spamfilter | Email & Exchange > Spamfilter > Spamfilter | Email & Exchange > Spamfilter > Spamfilter templates | Email & Exchange > Spamfilter > Quarantine Policies | Email & Exchange > Reports | Email & Exchange > Reports > Anti-Phishing Filters | Email & Exchange > Reports > Malware Filters
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListAntiPhishingFilters, ListMailQuarantine, ListMailQuarantineMessage, ListMalwareFilters, ListQuarantinePolicy, ListSafeAttachmentsFilters, ListSafeLinksPolicyDetails, ListSpamFilterTemplates, ListSpamfilter, ListTenantAllowBlockList, ListTenantAllowBlockListTemplates
- **Backend functions unlocked at ReadWrite:** AddSpamFilter, AddTenantAllowBlockList, AddTenantAllowBlockListTemplate, EditAntiPhishingFilter, EditMalwareFilter, EditSafeAttachmentsFilter, EditSafeLinksPolicy, EditSpamFilter, EditTenantAllowBlockListTemplate, ExecDeleteSafeLinksPolicy, ExecNewSafeLinksPolicy, ExecQuarantineManagement, RemoveTenantAllowBlockList, RemoveTenantAllowBlockListTemplate

### Exchange.TransportRule

Mail flow transport rules and transport rule templates.

- **Nav sections:** Email & Exchange | Email & Exchange > Transport | Email & Exchange > Transport > Transport rules | Email & Exchange > Transport > Transport Templates
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListTransportRules, ListTransportRulesTemplates
- **Backend functions unlocked at ReadWrite:** AddEditTransportRule, AddTransportRule, AddTransportTemplate, EditTransportRule, RemoveTransportRule, RemoveTransportRuleTemplate

## Identity

### Identity.AuditLog

Entra ID sign-in/audit log reporting, surfaced both under Identity Management > Reports and Tenant Administration > Audit Logs.

- **Nav sections:** Identity Management > Reports | Tenant Administration | Tenant Administration > Administration > Audit Logs
- **Cross-check:** Not cross-checked (baseline permission or no checkable surface)
- **Backend functions unlocked at Read:** ListBasicAuth, ListObjectHistory, ListSignIns

### Identity.Device

Entra ID device registration records/reporting (distinct from Endpoint.Device, which is Intune's management view of the same physical devices).

- **Nav sections:** Identity Management > Administration > Devices | Identity Management > Reports
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ListDetectedAppDevices, ListDetectedApps, ListDeviceDetails
- **Backend functions unlocked at ReadWrite:** ExecDeviceDelete

**Mismatches (1):** UI element gated by `Identity.Device.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /identity/administration/devices (`src/pages/identity/administration/devices/index.js:49`) | ExecGetRecoveryKey | action | `Endpoint.Device.Read` |

### Identity.Group

Entra ID group administration: Groups, Group Templates, and group reporting.

- **Nav sections:** Identity Management > Administration > Groups | Identity Management > Administration > Group Templates | Identity Management > Reports
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ListGroupTemplates, ListGroups
- **Backend functions unlocked at ReadWrite:** AddGroup, AddGroupTeam, AddGroupTemplate, EditGroup, RemoveGroupTemplate

**Mismatches (2):** UI element gated by `Identity.Group.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /identity/administration/groups (`src/pages/identity/administration/groups/index.js:59`) | ExecGroupsHideFromGAL | action | `Exchange.Group.ReadWrite` |
| /identity/administration/groups (`src/pages/identity/administration/groups/index.js:84`) | ExecGroupsDeliveryManagement | action | `Exchange.Group.ReadWrite` |

### Identity.Role

Entra ID directory role administration, plus CIPP's Just-In-Time (JIT) admin elevation feature and JIT admin templates.

- **Nav sections:** Identity Management > Administration > Roles | Identity Management > Administration > JIT Admin | Identity Management > Administration > JIT Admin Templates | Identity Management > Reports
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListJITAdmin, ListJITAdminTemplates, ListRoles
- **Backend functions unlocked at ReadWrite:** AddJITAdminTemplate, EditJITAdminTemplate, ExecJITAdmin, ExecRemoveAdminRole, RemoveJITAdminTemplate

### Identity.User

Core user lifecycle management: Users, Risky Users, Deleted Items, Vacation Mode, Offboarding Wizard; plus user-centric reports (MFA, inactive users, sign-in, Entra Connect, risk detections). This is the single largest and most frequently touched permission for technician-tier roles.

- **Nav sections:** Identity Management > Administration | Identity Management > Administration > Users | Identity Management > Administration > Risky Users | Identity Management > Administration > Deleted Items | Identity Management > Administration > Vacation Mode | Identity Management > Administration > Offboarding Wizard | Identity Management > Reports | Identity Management > Reports > MFA Report | Identity Management > Reports > Inactive Users | Identity Management > Reports > Sign-in Report | Identity Management > Reports > Microsoft Entra Connect Report | Identity Management > Reports > Risk Detections
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ExecBECCheck, ExecSendPush, ListMFAUsers, ListNewUserDefaults, ListPerUserMFA, ListUserConditionalAccessPolicies, ListUserCounts, ListUserDevices, ListUserGroups, ListUserPhoto, ListUserSettings, ListUserSigninLogs, ListUsers
- **Backend functions unlocked at ReadWrite:** AddGuest, AddUser, AddUserBulk, AddUserDefaults, EditUser, EditUserAliases, ExecBECRemediate, ExecBulkLicense, ExecClrImmId, ExecCreateTAP, ExecDisableUser, ExecDismissRiskyUser, ExecOffboardUser, ExecOneDriveProvision, ExecOneDriveShortCut, ExecPasswordNeverExpires, ExecPerUserMFA, ExecReprocessUserLicenses, ExecResetMFA, ExecResetPass, ExecRevokeSessions, ExecSetUserPhoto, PatchUser, RemoveUser, RemoveUserDefaultTemplate

**Mismatches (6):** UI element gated by `Identity.User.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /identity/administration/deleted-items (`src/pages/identity/administration/deleted-items/index.js:13`) | ExecRestoreDeleted | action | `Tenant.Directory.ReadWrite` |
| /identity/administration/deleted-items (`src/pages/identity/administration/deleted-items/index.js:22`) | RemoveDeletedObject | action | `Tenant.Directory.ReadWrite` |
| /identity/administration/deleted-items (`src/pages/identity/administration/deleted-items/index.js:60`) | ListDeletedItems | read | `Tenant.Directory.Read` |
| /identity/reports/inactive-users-report (`src/pages/identity/reports/inactive-users-report/index.js:11`) | ListInactiveAccounts | read | `Tenant.Directory.Read` |
| /identity/reports/azure-ad-connect-report (`src/pages/identity/reports/azure-ad-connect-report/index.js:11`) | ListAzureADConnectStatus | read | `Tenant.Directory.Read` |
| (shared component) (`src/components/CippComponents/CippUserActions.jsx:776`) | ExecSetOneDriveSharing | action | `Teams.SharePoint.ReadWrite` |

## Scheduler

### Scheduler.Billing

Partner billing sync automation: triggers scheduled billing runs against configured PSA/billing integrations (e.g. Gradient). API-only - invoked by CIPP's internal scheduler rather than any user-facing page, so it has no meaningful UI surface. Only relevant for API-client roles or roles that manage billing extension automation.

- **Nav sections:** Tenant Administration | Tenant Administration > Reports
- **Cross-check:** Not cross-checked (no nav/component gate to verify)
- **Backend functions unlocked at ReadWrite:** ExecSchedulerBillingRun

## Security

### Security.Alert

Microsoft Defender alert triage: listing and updating security alerts, MDO alert data, and CVE exception actions. Caution for role design: the Defender pages this permission makes visible (Defender Status, Defender Deployment, Vulnerabilities, CVE Management) fetch their data under different permissions - pair with Endpoint.MEM.Read for the Defender/vulnerability pages (ReadWrite for deployment), Endpoint.Security.Read for the CVE list, and Security.Incident.ReadWrite for MDO alert triage. Granting Security.Alert alone shows these pages but their data calls fail.

- **Nav sections:** Security & Compliance | Security & Compliance > Incidents & Alerts > Alerts | Security & Compliance > Incidents & Alerts > MDO Alerts | Security & Compliance > Incidents & Alerts > Check Alerts | Security & Compliance > Defender | Security & Compliance > Defender > Defender Status | Security & Compliance > Defender > Defender Deployment | Security & Compliance > Defender > Vulnerabilities | Security & Compliance > Defender > CVE Management
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ExecAlertsList, ExecMDOAlertsList
- **Backend functions unlocked at ReadWrite:** ExecAddCippCveException, ExecRemoveCippCveException, ExecSetSecurityAlert

**Mismatches (5):** UI element gated by `Security.Alert.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /security/incidents/list-mdo-alerts (`src/pages/security/incidents/list-mdo-alerts/index.js:14`) | ExecSetMdoAlert | action | `Security.Incident.ReadWrite` |
| /security/defender/list-defender (`src/pages/security/defender/list-defender/index.js:10`) | ListDefenderState | read | `Endpoint.MEM.Read` |
| /security/defender/deployment (`src/pages/security/defender/deployment/index.js:988`) | AddDefenderTemplate | action | `Endpoint.MEM.ReadWrite` |
| /security/defender/list-defender-tvm (`src/pages/security/defender/list-defender-tvm/index.js:10`) | ListDefenderTVM | read | `Endpoint.MEM.Read` |
| /security/defender/defender-cve-exceptions (`src/pages/security/defender/defender-cve-exceptions/index.js:170`) | ListCVEManagement | read | `Endpoint.Security.Read` |

### Security.Defender

Defender-for-Endpoint reporting: MDE onboarding status and vulnerability report (read-oriented, distinct from Security.Alert's action-oriented alert triage).

- **Nav sections:** Security & Compliance > Reports | Security & Compliance > Reports > MDE Onboarding | Security & Compliance > Reports > Vulnerability Report
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ListMDEOnboarding

**Mismatches (1):** UI element gated by `Security.Defender.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /security/reports/cve-report (`src/pages/security/reports/cve-report/index.js:8`) | ListCveManagement | read | `Endpoint.Security.Read` |

### Security.DlpCompliancePolicy

Microsoft Purview Data Loss Prevention (DLP) policies and DLP policy templates.

- **Nav sections:** Security & Compliance | Security & Compliance > Purview Compliance | Security & Compliance > Purview Compliance > DLP Policies | Security & Compliance > Purview Compliance > DLP Policy Templates
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListDlpCompliancePolicy, ListDlpCompliancePolicyTemplates
- **Backend functions unlocked at ReadWrite:** AddDlpCompliancePolicy, AddDlpCompliancePolicyTemplate, EditDlpCompliancePolicy, RemoveDlpCompliancePolicy, RemoveDlpCompliancePolicyTemplate

### Security.Incident

Microsoft Defender/Purview security incidents list.

- **Nav sections:** Security & Compliance | Security & Compliance > Incidents & Alerts | Security & Compliance > Incidents & Alerts > Incidents
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ExecIncidentsList
- **Backend functions unlocked at ReadWrite:** ExecSetMdoAlert, ExecSetSecurityIncident

### Security.RetentionCompliancePolicy

Microsoft Purview compliance retention policies and templates (organization-wide compliance retention, not Exchange mailbox retention tags - see Exchange.RetentionPolicies).

- **Nav sections:** Security & Compliance | Security & Compliance > Purview Compliance | Security & Compliance > Purview Compliance > Retention Policies | Security & Compliance > Purview Compliance > Retention Policy Templates
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListRetentionCompliancePolicy, ListRetentionCompliancePolicyTemplates
- **Backend functions unlocked at ReadWrite:** AddRetentionCompliancePolicy, AddRetentionCompliancePolicyTemplate, EditRetentionCompliancePolicy, RemoveRetentionCompliancePolicy, RemoveRetentionCompliancePolicyTemplate

### Security.SafeLinksPolicy

Visibility and read access for the Safe Links pages (Safe Links Policies, Safe Links Templates). Largely a view-only permission: it has no write-level backend functions of its own. The actual management work on those pages requires Exchange.SpamFilter.ReadWrite (policy edit/delete) and Exchange.SafeLinks.ReadWrite (template management) - grant all three together for working Safe Links administration.

- **Nav sections:** Security & Compliance | Security & Compliance > Safe Links | Security & Compliance > Safe Links > Safe Links Policies | Security & Compliance > Safe Links > Safe Links Templates
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ListSafeLinksPolicy

**Mismatches (5):** UI element gated by `Security.SafeLinksPolicy.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /security/safelinks/safelinks (`src/pages/security/safelinks/safelinks/index.jsx:37`) | EditSafeLinksPolicy | action | `Exchange.SpamFilter.ReadWrite` |
| /security/safelinks/safelinks (`src/pages/security/safelinks/safelinks/index.jsx:93`) | AddSafeLinksPolicyTemplate | action | `Exchange.SafeLinks.ReadWrite` |
| /security/safelinks/safelinks (`src/pages/security/safelinks/safelinks/index.jsx:104`) | ExecDeleteSafeLinksPolicy | action | `Exchange.SpamFilter.ReadWrite` |
| /security/safelinks/safelinks-template (`src/pages/security/safelinks/safelinks-template/index.jsx:75`) | RemoveSafeLinksPolicyTemplate | action | `Exchange.SafeLinks.ReadWrite` |
| /security/safelinks/safelinks-template (`src/pages/security/safelinks/safelinks-template/index.jsx:93`) | ListSafeLinksPolicyTemplates | read | `Exchange.SafeLinks.Read` |

### Security.SensitiveInfoType

Purview Sensitive Information Type definitions and templates (used by DLP/labels to detect PII, credit cards, etc.).

- **Nav sections:** Security & Compliance | Security & Compliance > Purview Compliance | Security & Compliance > Purview Compliance > Sensitive Information Types | Security & Compliance > Purview Compliance > Sensitive Info Type Templates
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListSensitiveInfoType, ListSensitiveInfoTypeRulePackage, ListSensitiveInfoTypeTemplates
- **Backend functions unlocked at ReadWrite:** AddSensitiveInfoType, AddSensitiveInfoTypeTemplate, EditSensitiveInfoType, RemoveSensitiveInfoType, RemoveSensitiveInfoTypeTemplate

### Security.SensitivityLabel

Purview Sensitivity Labels and label templates (classification/protection labels for documents and emails).

- **Nav sections:** Security & Compliance | Security & Compliance > Purview Compliance | Security & Compliance > Purview Compliance > Sensitivity Labels | Security & Compliance > Purview Compliance > Sensitivity Label Templates
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListSensitivityLabel, ListSensitivityLabelTemplates
- **Backend functions unlocked at ReadWrite:** AddSensitivityLabel, AddSensitivityLabelTemplate, EditSensitivityLabel, RemoveSensitivityLabel, RemoveSensitivityLabelTemplate

## Sharepoint

### Sharepoint.Admin

SharePoint tenant-level settings and quota visibility, and nav access to the SharePoint and Deleted Sites pages. View-only in practice: it has no write-level backend functions, and everything you can do on those pages (site membership/permissions, deletion, deleted-site restore) runs under Sharepoint.Site. Grant Sharepoint.Site at the intended level alongside it, or the pages render but nothing works.

- **Nav sections:** Teams & SharePoint | Teams & SharePoint > SharePoint | Teams & SharePoint > Deleted Sites
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ListSharepointQuota, ListSharepointSettings

**Mismatches (9):** UI element gated by `Sharepoint.Admin.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /teams-share/sharepoint (`src/pages/teams-share/sharepoint/index.js:154`) | ExecSetSharePointMember | action | `Sharepoint.Site.ReadWrite` |
| /teams-share/sharepoint (`src/pages/teams-share/sharepoint/index.js:268`) | ExecRemoveSiteUser | action | `Sharepoint.Site.ReadWrite` |
| /teams-share/sharepoint (`src/pages/teams-share/sharepoint/index.js:320`) | ExecBulkRemoveSharingLinks | action | `Sharepoint.Site.ReadWrite` |
| /teams-share/sharepoint (`src/pages/teams-share/sharepoint/index.js:348`) | ExecSetSiteProperties | action | `Sharepoint.Site.ReadWrite` |
| /teams-share/sharepoint (`src/pages/teams-share/sharepoint/index.js:486`) | ExecSetLibraryPermission | action | `Sharepoint.Site.ReadWrite` |
| /teams-share/sharepoint (`src/pages/teams-share/sharepoint/index.js:605`) | DeleteSharepointSite | action | `Sharepoint.Site.ReadWrite` |
| /teams-share/sharepoint (`src/pages/teams-share/sharepoint/index.js:634`) | ExecSPOVersionCleanup | action | `Sharepoint.Site.ReadWrite` |
| /teams-share/deleted-sites (`src/pages/teams-share/deleted-sites.js:15`) | ExecRestoreDeletedSite | action | `Sharepoint.Site.ReadWrite` |
| /teams-share/deleted-sites (`src/pages/teams-share/deleted-sites.js:29`) | ListDeletedSites | read | `Sharepoint.Site.Read` |

### Sharepoint.Site

OneDrive administration, Sharing Report, External Users report, and general SharePoint site listing/actions.

- **Nav sections:** Teams & SharePoint | Teams & SharePoint > OneDrive | Teams & SharePoint > Sharing Report | Teams & SharePoint > External Users
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListDeletedSites, ListSPOVersionCleanup, ListSharePointExternalUsers, ListSharePointSharing, ListSiteLibraries, ListSiteMembers, ListSiteProperties, ListSites
- **Backend functions unlocked at ReadWrite:** AddSite, AddSiteBulk, DeleteSharepointSite, ExecBulkRemoveSharingLinks, ExecRemoveSPOExternalUser, ExecRemoveSharingLink, ExecRemoveSiteUser, ExecRestoreDeletedSite, ExecSPOVersionCleanup, ExecSetLibraryPermission, ExecSetSharePointMember, ExecSetSiteProperties, ExecSharePointPerms

### Sharepoint.SiteRecycleBin

Per-site recycle bin restore actions (no dedicated nav entry found - surfaced as an action/dialog from within the Sites page rather than its own menu item).

- **Nav sections:** _none - no frontend UI surface_
- **Cross-check:** Not cross-checked (no nav/component gate to verify)
- **Backend functions unlocked at Read:** ListSiteRecycleBin
- **Backend functions unlocked at ReadWrite:** ExecRestoreRecycleBinItems

## Teams

### Teams.Activity

Microsoft Teams activity reporting.

- **Nav sections:** Teams & SharePoint | Teams & SharePoint > Teams > Teams Activity
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListTeamsActivity

### Teams.Group

Microsoft Teams team listing and management.

- **Nav sections:** Teams & SharePoint | Teams & SharePoint > Teams | Teams & SharePoint > Teams > Teams
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListTeams
- **Backend functions unlocked at ReadWrite:** AddTeam

### Teams.Voice

Teams Phone/Business Voice configuration.

- **Nav sections:** Teams & SharePoint | Teams & SharePoint > Teams > Business Voice
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListTeamsLisLocation, ListTeamsVoice
- **Backend functions unlocked at ReadWrite:** ExecRemoveTeamsVoicePhoneNumberAssignment, ExecTeamsVoicePhoneNumberAssignment

## Tenant

### Tenant.Administration

Core MSP tenant administration: Tenants list, Secure Score, Domains, Licence Report, Manage Tenant, plus the Graph Explorer and Tenant Lookup tools. This is the broad "can operate CIPP against a tenant at all" permission alongside Identity.User.

- **Nav sections:** Tenant Administration > Administration | Tenant Administration > Administration > Tenants | Tenant Administration > Administration > Secure Score | Tenant Administration > Administration > Domains | Tenant Administration > Reports | Tenant Administration > Reports > Licence Report | Tenant Administration > Manage Tenant | Tools | Tools > Tenant Tools | Tools > Tenant Tools > Graph Explorer | Tools > Tenant Tools > Tenant Lookup
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ListAppConsentRequests, ListDomains, ListServiceHealth, ListTenantOnboarding
- **Backend functions unlocked at ReadWrite:** AddDomain, ExecAddSPN, ExecDomainAction, ExecOffboardTenant, ExecOnboardTenant, ExecRemoveTenant, ExecUpdateSecureScore, ListOffboardTenants, RemoveTenantCapabilitiesCache, SetAuthMethod

**Mismatches (2):** UI element gated by `Tenant.Administration.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /tenant/reports/list-licenses (`src/pages/tenant/reports/list-licenses/index.js:10`) | ListLicensesReport | read | `Tenant.Directory.Read` |
| /tenant/reports/list-licenses (`src/pages/tenant/reports/list-licenses/index.js:40`) | ExecBulkLicense | action | `Identity.User.ReadWrite` |

### Tenant.Alert

CIPP's audit-log alerting plumbing: audit log searches, coverage, and webhook subscriptions. Makes the Alert Configuration page visible, but that page's actual alert queue and add/remove actions run under a backend-only permission (CIPP.Alert) that the role editor doesn't surface - so expect the page's actions to fail for custom roles granted this permission alone. These two are effectively one feature and should be treated as inseparable until unified upstream.

- **Nav sections:** Tenant Administration > Administration > Alert Configuration
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ListAuditLogCoverage, ListAuditLogSearches, ListAuditLogTest
- **Backend functions unlocked at ReadWrite:** ExecAuditLogSearch, ExecWebhookSubscriptions

**Mismatches (2):** UI element gated by `Tenant.Alert.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /tenant/administration/alert-configuration (`src/pages/tenant/administration/alert-configuration/index.js:35`) | RemoveQueuedAlert | action | `CIPP.Alert.ReadWrite` |
| /tenant/administration/alert-configuration (`src/pages/tenant/administration/alert-configuration/index.js:50`) | ListAlertsQueue | read | `CIPP.Alert.Read` |

### Tenant.Application

Entra app registrations and enterprise applications administration, app consent requests, consented-applications report, and the Application Approval tool. One pairing quirk: the App Consent Requests page’s data call runs under Tenant.Administration.Read - grant that alongside for the page to load.

- **Nav sections:** Tenant Administration > Administration > Applications | Tenant Administration > Administration > App Consent Requests | Tenant Administration > Reports | Tenant Administration > Reports > Consented Applications | Tools | Tools > Tenant Tools > Application Approval
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ExecAppApproval, ListAppApprovalTemplates, ListOAuthApps
- **Backend functions unlocked at ReadWrite:** ExecAddMultiTenantApp, ExecAppApprovalTemplate, ExecApplication, ExecCreateAppTemplate, ExecManageAppCredentials, ExecServicePrincipals

**Mismatches (1):** UI element gated by `Tenant.Application.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /tenant/administration/app-consent-requests (`src/pages/tenant/administration/app-consent-requests/index.js:20`) | ListAppConsentRequests | read | `Tenant.Administration.Read` |

### Tenant.BestPracticeAnalyser

Standards & Drift's Best Practice Analyser results.

- **Nav sections:** Tenant Administration > Standards & Drift | Tenant Administration > Standards & Drift > Best Practice Analyser
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** BestPracticeAnalyser_List, ListBPA, ListBPATemplates, ListStandardsCompare
- **Backend functions unlocked at ReadWrite:** AddBPATemplate, ExecBPA

**Mismatches (1):** UI element gated by `Tenant.BestPracticeAnalyser.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /tenant/standards/bpa-report (`src/pages/tenant/standards/bpa-report/index.js:92`) | RemoveBPATemplate | action | `Tenant.Standards.ReadWrite` |

### Tenant.ConditionalAccess

Conditional Access policy administration: CA Policies, CA Vacation Mode, CA Templates, Named Locations.

- **Nav sections:** Tenant Administration > Conditional Access | Tenant Administration > Conditional Access > CA Policies | Tenant Administration > Conditional Access > CA Vacation Mode | Tenant Administration > Conditional Access > CA Templates | Tenant Administration > Conditional Access > Named Locations
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ExecCaCheck, ListCAtemplates, ListConditionalAccessPolicies, ListConditionalAccessPolicyChanges, ListNamedLocations
- **Backend functions unlocked at ReadWrite:** AddCAPolicy, AddCATemplate, AddNamedLocation, EditCAPolicy, ExecCAExclusion, ExecCAServiceExclusion, ExecCreateCATemplate, ExecEditCAPolicyFull, ExecNamedLocation, RemoveCAPolicy, RemoveCATemplate

**Mismatches (1):** UI element gated by `Tenant.ConditionalAccess.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /tenant/conditional/list-template (`src/pages/tenant/conditional/list-template/index.js:49`) | ExecSetPackageTag | action | `CIPP.Core.ReadWrite` |

### Tenant.Config

Tenant lifecycle configuration: adding and editing tenants, offboarding defaults, and replacement maps (write-only - it has no read-level functions). Despite the nav tagging, the Authentication Methods page it makes visible actually operates under Tenant.Administration.ReadWrite - grant that instead/alongside if a role needs to manage authentication methods.

- **Nav sections:** Tenant Administration > Administration > Authentication Methods
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at ReadWrite:** AddTenant, EditTenant, EditTenantOffboardingDefaults, ExecCippReplacemap

**Mismatches (1):** UI element gated by `Tenant.Config.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /tenant/administration/authentication-methods (`src/pages/tenant/administration/authentication-methods/index.js:237`) | SetAuthMethod | action | `Tenant.Administration.ReadWrite` |

### Tenant.DeviceCompliance

Cross-tenant device compliance reporting (surfaced under the Security & Compliance nav section despite the Tenant category name).

- **Nav sections:** Security & Compliance | Security & Compliance > Reports | Security & Compliance > Reports > Device Compliance
- **Cross-check:** Not cross-checked (baseline permission or no checkable surface)
- **Backend functions unlocked at Read:** ListAllTenantDeviceCompliance

### Tenant.Directory

Broad directory-data permission covering deleted directory object restore/purge (the Identity > Deleted Items page), inactive account reporting, Entra Connect status, licence data and reports (including Sherweb/CSP licences and CSP licence purchase), users-and-groups listing, and org messages. Easy to overlook because its nav footprint looks tiny (Sherweb Licence Report): any tier that includes deleted-item restore or licence reporting must also carry Tenant.Directory at the matching level.

- **Nav sections:** Tenant Administration > Reports > Sherweb Licence Report
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListAzureADConnectStatus, ListCSPLicenses, ListCSPsku, ListDeletedItems, ListInactiveAccounts, ListLicenses, ListLicensesReport, ListUsersAndGroups
- **Backend functions unlocked at ReadWrite:** ExecCSPLicense, ExecRestoreDeleted, ExecSendOrgMessage, RemoveDeletedObject

### Tenant.DomainAnalyser

Domain health analyser results and the individual domain check tool.

- **Nav sections:** Tenant Administration > Standards & Drift | Tenant Administration > Standards & Drift > Domains Analyser | Tools | Tools > Tenant Tools > Individual Domain Check
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** DomainAnalyser_List, ListDomainAnalyser, ListDomainHealth
- **Backend functions unlocked at ReadWrite:** ExecDomainAnalyser

**Mismatches (1):** UI element gated by `Tenant.DomainAnalyser.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /tenant/standards/domains-analyser (`src/pages/tenant/standards/domains-analyser/index.js:26`) | ExecDnsConfig | action | `Tenant.Domains.ReadWrite` |

### Tenant.Relationship

Partner relationship (GDAP) management and the GDAP Management page.

- **Nav sections:** Tenant Administration > Administration > Partner Relationships | Tenant Administration > GDAP Management
- **Cross-check:** Not cross-checked (baseline permission or no checkable surface)
- **Backend functions unlocked at Read:** ListGDAPAccessAssignments, ListGDAPContracts, ListGDAPInvite, ListGDAPRelationships, ListGDAPRoles, ListGDAPServicePrincipals, ListPartnerRelationships, ListResellerRelationshipLink
- **Backend functions unlocked at ReadWrite:** ExecAddGDAPRole, ExecAutoExtendGDAP, ExecDeleteGDAPRelationship, ExecDeleteGDAPRoleMapping, ExecGDAPAccessAssignment, ExecGDAPInvite, ExecGDAPInviteApproved, ExecGDAPRemoveGArole, ExecGDAPRepairRoleMappings, ExecGDAPRoleTemplate

### Tenant.Reports

Generic Graph/Office 365 usage reports and the Custom Test report.

- **Nav sections:** Tenant Administration > Reports > Graph / Office Reports | Tenant Administration > Reports > Custom Test Report
- **Cross-check:** MISMATCHES FOUND - see table below
- **Backend functions unlocked at Read:** ListGraphReports, ListTestReports, ListTestResultsTenants, ListTests

**Mismatches (1):** UI element gated by `Tenant.Reports.*` but backend requires a different permission:

| Page | Endpoint | Kind | Backend requires |
|---|---|---|---|
| /tenant/reports/custom-test-report (`src/pages/tenant/reports/custom-test-report/index.js:125`) | ExecCustomTestRun | action | `Tenant.Tests.ReadWrite` |

### Tenant.Standards

CIPP's Standards & Drift engine: standards deployment/templates, drift monitoring and deviation management. Also bundles the entire Copilot & AI feature set (Copilot settings and usage reports, Shadow AI discovery and sanctioning, Agent365 packages) - the two share one permission with no backend separation, so Read grants visibility into Copilot/AI data and ReadWrite grants control over Copilot settings and AI governance. Splitting Copilot into its own grantable permission would require an upstream backend change.

- **Nav sections:** Tenant Administration > Standards & Drift | Tenant Administration > Standards & Drift > Standards Management | Copilot & AI | Copilot & AI > Shadow AI Discovery | Copilot & AI > Copilot Settings | Copilot & AI > Agent365 | Copilot & AI > Agent365 > Packages | Copilot & AI > Reports | Copilot & AI > Reports > Copilot Adoption | Copilot & AI > Reports > Copilot Usage Trend | Copilot & AI > Reports > Copilot User Activity
- **Cross-check:** Consistent - frontend gating matches backend enforcement
- **Backend functions unlocked at Read:** ListAgent365PackageDetail, ListAgent365Packages, ListCopilotSettings, ListCopilotUsage, ListShadowAI, ListStandards, ListStandardsCurrentState, ListTenantAlignment, ListTenantDrift, listStandardTemplates
- **Backend functions unlocked at ReadWrite:** AddStandardsDeploy, AddStandardsTemplate, ExecCopilotSettings, ExecDriftClone, ExecShadowAISanction, ExecStandardConvert, ExecStandardsRun, ExecUpdateDriftDeviation, RemoveBPATemplate, RemoveStandard, RemoveStandardTemplate

## All Mismatches (role-design checklist)

Each row is a place where granting the frontend permission shows a UI element whose action needs a DIFFERENT backend permission. For tiered roles: either grant both permissions, or expect the element to fail/403 for that tier.

| Frontend permission | Page | Source | Endpoint | Backend requires |
|---|---|---|---|---|
| `CIPP.Core.*` | /tenant/tools/geoiplookup | `src/pages/tenant/tools/geoiplookup/index.js:33` | ExecAddTrustedIP | `CIPP.AppSettings.ReadWrite` |
| `Endpoint.Autopilot.*` | /endpoint/autopilot/enrollment-profiles | `src/pages/endpoint/autopilot/enrollment-profiles/index.js:249` | ExecRemoveEnrollmentProfile | `Endpoint.MEM.ReadWrite` |
| `Endpoint.Autopilot.*` | /endpoint/autopilot/enrollment-profiles | `src/pages/endpoint/autopilot/enrollment-profiles/index.js:345` | ExecSyncDEP | `Endpoint.MEM.ReadWrite` |
| `Endpoint.Device.*` | /endpoint/MEM/devices | `src/pages/endpoint/MEM/devices/index.js:63` | ExecSyncDEP | `Endpoint.MEM.ReadWrite` |
| `Endpoint.MEM.*` | /endpoint/MEM/list-templates | `src/pages/endpoint/MEM/list-templates/index.js:45` | ExecEditTemplate | `CIPP.Core.ReadWrite` |
| `Endpoint.MEM.*` | /endpoint/MEM/list-templates | `src/pages/endpoint/MEM/list-templates/index.js:72` | ExecCloneTemplate | `CIPP.Core.ReadWrite` |
| `Endpoint.MEM.*` | /endpoint/MEM/list-templates | `src/pages/endpoint/MEM/list-templates/index.js:83` | ExecSetPackageTag | `CIPP.Core.ReadWrite` |
| `Endpoint.MEM.ReadWrite` | (file-level gate) | `src/pages/security/defender/defender-cve-exceptions/index.js:31` | ExecAddCippCveException | `Security.Alert.ReadWrite` |
| `Endpoint.MEM.ReadWrite` | (file-level gate) | `src/pages/security/defender/defender-cve-exceptions/index.js:83` | ExecRemoveCippCveException | `Security.Alert.ReadWrite` |
| `Exchange.Group.*` | /email/reports/global-address-list | `src/pages/email/reports/global-address-list/index.js:69` | ListGlobalAddressList | `Exchange.Mailbox.Read` |
| `Exchange.Mailbox.*` | /email/administration/mailboxes | `src/pages/email/administration/mailboxes/index.js:161` | ExecSendPush | `Identity.User.Read` |
| `Exchange.SafeLinks.*` | /email/reports/safeattachments-filters | `src/pages/email/reports/safeattachments-filters/index.js:7` | ListSafeAttachmentsFilters | `Exchange.SpamFilter.Read` |
| `Exchange.SafeLinks.*` | /email/reports/safeattachments-filters | `src/pages/email/reports/safeattachments-filters/index.js:15` | EditSafeAttachmentsFilter | `Exchange.SpamFilter.ReadWrite` |
| `Identity.Device.*` | /identity/administration/devices | `src/pages/identity/administration/devices/index.js:49` | ExecGetRecoveryKey | `Endpoint.Device.Read` |
| `Identity.Group.*` | /identity/administration/groups | `src/pages/identity/administration/groups/index.js:59` | ExecGroupsHideFromGAL | `Exchange.Group.ReadWrite` |
| `Identity.Group.*` | /identity/administration/groups | `src/pages/identity/administration/groups/index.js:84` | ExecGroupsDeliveryManagement | `Exchange.Group.ReadWrite` |
| `Identity.User.*` | /identity/administration/deleted-items | `src/pages/identity/administration/deleted-items/index.js:13` | ExecRestoreDeleted | `Tenant.Directory.ReadWrite` |
| `Identity.User.*` | /identity/administration/deleted-items | `src/pages/identity/administration/deleted-items/index.js:22` | RemoveDeletedObject | `Tenant.Directory.ReadWrite` |
| `Identity.User.*` | /identity/administration/deleted-items | `src/pages/identity/administration/deleted-items/index.js:60` | ListDeletedItems | `Tenant.Directory.Read` |
| `Identity.User.*` | /identity/reports/inactive-users-report | `src/pages/identity/reports/inactive-users-report/index.js:11` | ListInactiveAccounts | `Tenant.Directory.Read` |
| `Identity.User.*` | /identity/reports/azure-ad-connect-report | `src/pages/identity/reports/azure-ad-connect-report/index.js:11` | ListAzureADConnectStatus | `Tenant.Directory.Read` |
| `Identity.User.ReadWrite` | (shared component) | `src/components/CippComponents/CippUserActions.jsx:776` | ExecSetOneDriveSharing | `Teams.SharePoint.ReadWrite` |
| `Security.Alert.*` | /security/incidents/list-mdo-alerts | `src/pages/security/incidents/list-mdo-alerts/index.js:14` | ExecSetMdoAlert | `Security.Incident.ReadWrite` |
| `Security.Alert.*` | /security/defender/list-defender | `src/pages/security/defender/list-defender/index.js:10` | ListDefenderState | `Endpoint.MEM.Read` |
| `Security.Alert.*` | /security/defender/deployment | `src/pages/security/defender/deployment/index.js:988` | AddDefenderTemplate | `Endpoint.MEM.ReadWrite` |
| `Security.Alert.*` | /security/defender/list-defender-tvm | `src/pages/security/defender/list-defender-tvm/index.js:10` | ListDefenderTVM | `Endpoint.MEM.Read` |
| `Security.Alert.*` | /security/defender/defender-cve-exceptions | `src/pages/security/defender/defender-cve-exceptions/index.js:170` | ListCVEManagement | `Endpoint.Security.Read` |
| `Security.Defender.*` | /security/reports/cve-report | `src/pages/security/reports/cve-report/index.js:8` | ListCveManagement | `Endpoint.Security.Read` |
| `Security.SafeLinksPolicy.*` | /security/safelinks/safelinks | `src/pages/security/safelinks/safelinks/index.jsx:37` | EditSafeLinksPolicy | `Exchange.SpamFilter.ReadWrite` |
| `Security.SafeLinksPolicy.*` | /security/safelinks/safelinks | `src/pages/security/safelinks/safelinks/index.jsx:93` | AddSafeLinksPolicyTemplate | `Exchange.SafeLinks.ReadWrite` |
| `Security.SafeLinksPolicy.*` | /security/safelinks/safelinks | `src/pages/security/safelinks/safelinks/index.jsx:104` | ExecDeleteSafeLinksPolicy | `Exchange.SpamFilter.ReadWrite` |
| `Security.SafeLinksPolicy.*` | /security/safelinks/safelinks-template | `src/pages/security/safelinks/safelinks-template/index.jsx:75` | RemoveSafeLinksPolicyTemplate | `Exchange.SafeLinks.ReadWrite` |
| `Security.SafeLinksPolicy.*` | /security/safelinks/safelinks-template | `src/pages/security/safelinks/safelinks-template/index.jsx:93` | ListSafeLinksPolicyTemplates | `Exchange.SafeLinks.Read` |
| `Sharepoint.Admin.*` | /teams-share/sharepoint | `src/pages/teams-share/sharepoint/index.js:154` | ExecSetSharePointMember | `Sharepoint.Site.ReadWrite` |
| `Sharepoint.Admin.*` | /teams-share/sharepoint | `src/pages/teams-share/sharepoint/index.js:268` | ExecRemoveSiteUser | `Sharepoint.Site.ReadWrite` |
| `Sharepoint.Admin.*` | /teams-share/sharepoint | `src/pages/teams-share/sharepoint/index.js:320` | ExecBulkRemoveSharingLinks | `Sharepoint.Site.ReadWrite` |
| `Sharepoint.Admin.*` | /teams-share/sharepoint | `src/pages/teams-share/sharepoint/index.js:348` | ExecSetSiteProperties | `Sharepoint.Site.ReadWrite` |
| `Sharepoint.Admin.*` | /teams-share/sharepoint | `src/pages/teams-share/sharepoint/index.js:486` | ExecSetLibraryPermission | `Sharepoint.Site.ReadWrite` |
| `Sharepoint.Admin.*` | /teams-share/sharepoint | `src/pages/teams-share/sharepoint/index.js:605` | DeleteSharepointSite | `Sharepoint.Site.ReadWrite` |
| `Sharepoint.Admin.*` | /teams-share/sharepoint | `src/pages/teams-share/sharepoint/index.js:634` | ExecSPOVersionCleanup | `Sharepoint.Site.ReadWrite` |
| `Sharepoint.Admin.*` | /teams-share/deleted-sites | `src/pages/teams-share/deleted-sites.js:15` | ExecRestoreDeletedSite | `Sharepoint.Site.ReadWrite` |
| `Sharepoint.Admin.*` | /teams-share/deleted-sites | `src/pages/teams-share/deleted-sites.js:29` | ListDeletedSites | `Sharepoint.Site.Read` |
| `Tenant.Administration.*` | /tenant/reports/list-licenses | `src/pages/tenant/reports/list-licenses/index.js:10` | ListLicensesReport | `Tenant.Directory.Read` |
| `Tenant.Administration.*` | /tenant/reports/list-licenses | `src/pages/tenant/reports/list-licenses/index.js:40` | ExecBulkLicense | `Identity.User.ReadWrite` |
| `Tenant.Alert.*` | /tenant/administration/alert-configuration | `src/pages/tenant/administration/alert-configuration/index.js:35` | RemoveQueuedAlert | `CIPP.Alert.ReadWrite` |
| `Tenant.Alert.*` | /tenant/administration/alert-configuration | `src/pages/tenant/administration/alert-configuration/index.js:50` | ListAlertsQueue | `CIPP.Alert.Read` |
| `Tenant.Application.*` | /tenant/administration/app-consent-requests | `src/pages/tenant/administration/app-consent-requests/index.js:20` | ListAppConsentRequests | `Tenant.Administration.Read` |
| `Tenant.BestPracticeAnalyser.*` | /tenant/standards/bpa-report | `src/pages/tenant/standards/bpa-report/index.js:92` | RemoveBPATemplate | `Tenant.Standards.ReadWrite` |
| `Tenant.ConditionalAccess.*` | /tenant/conditional/list-template | `src/pages/tenant/conditional/list-template/index.js:49` | ExecSetPackageTag | `CIPP.Core.ReadWrite` |
| `Tenant.Config.*` | /tenant/administration/authentication-methods | `src/pages/tenant/administration/authentication-methods/index.js:237` | SetAuthMethod | `Tenant.Administration.ReadWrite` |
| `Tenant.DomainAnalyser.*` | /tenant/standards/domains-analyser | `src/pages/tenant/standards/domains-analyser/index.js:26` | ExecDnsConfig | `Tenant.Domains.ReadWrite` |
| `Tenant.Reports.*` | /tenant/reports/custom-test-report | `src/pages/tenant/reports/custom-test-report/index.js:125` | ExecCustomTestRun | `Tenant.Tests.ReadWrite` |

## Backend-only permissions

These `Category.Object` pairs are declared by CIPP-API functions but have no frontend UI surface - relevant for API-client roles, or as pairing requirements when a UI feature calls one of these functions.

### CIPP.Alert

- **Read:** ListAlertResults, ListSnoozedAlerts, ListPendingWebhooks, ListAlertsQueue, ListAuditLogs, ListWebhookAlert
- **ReadWrite:** ExecAddAlert, ExecRemoveSnooze, ExecSnoozeAlert, RemoveWebhookAlert, AddAlert, AddScriptedAlert, RemoveQueuedAlert

### CIPP.Dashboard

- **Read:** AddTestReport, DeleteTestReport, ListAvailableTests

### Endpoint.Security

- **Read:** ListCVEManagement

### Exchange.Groups

- **Read:** ListGroupSenderAuthentication

### Exchange.Spamfilter

- **ReadWrite:** AddQuarantinePolicy, AddSpamFilterTemplate, EditQuarantinePolicy, RemoveQuarantinePolicy, RemoveSpamfilter, RemoveSpamfilterTemplate

### Identity.DirSync

- **ReadWrite:** ExecSetCloudManaged

### Teams.SharePoint

- **ReadWrite:** ExecSetOneDriveSharing

### Tenant.ApplicationTemplates

- **ReadWrite:** ExecAppPermissionTemplate

### Tenant.Domains

- **ReadWrite:** ExecDnsConfig

### Tenant.Groups

- **ReadWrite:** ExecCreateDefaultGroups, ExecRunTenantGroupRule, ExecTenantGroup

### Tenant.Tests

- **ReadWrite:** ExecCustomTestRun, ExecTestRefresh, ExecTestRun

