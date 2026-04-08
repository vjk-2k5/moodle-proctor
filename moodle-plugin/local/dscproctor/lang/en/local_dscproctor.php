<?php
defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'DSC Proctor Rewrite';
$string['viewdashboard'] = 'View proctor rewrite dashboard';
$string['launchstudent'] = 'Open student launch page';
$string['managerewrite'] = 'Manage Moodle-native rewrite settings';

$string['dashboard'] = 'Rewrite dashboard';
$string['dashboardheading'] = 'Moodle-native proctoring foundation';
$string['teacherdashboard'] = 'Teacher dashboard';
$string['teacherdashboardheading'] = 'Teacher monitoring rewrite surface';
$string['studentlaunch'] = 'Student launch';
$string['studentlaunchheading'] = 'Student launch rewrite surface';
$string['rewriteadmin'] = 'Rewrite admin';

$string['registeredexams'] = 'Registered exams';
$string['openrooms'] = 'Open rooms';
$string['attempts'] = 'Attempts';
$string['activeattempts'] = 'Active attempts';
$string['violations'] = 'Violations';
$string['recentattempts'] = 'Recent attempts';
$string['recentviolations'] = 'Recent violations';
$string['noattempts'] = 'No native attempts have been recorded yet.';
$string['noviolationrecords'] = 'No native violations have been recorded yet.';
$string['noexams'] = 'No native exams have been registered yet.';
$string['norooms'] = 'No native rooms have been created yet.';

$string['legacyintegration'] = 'Legacy integration status';
$string['legacybackendstatus'] = 'Legacy backend health';
$string['legacybackendconfigured'] = 'The legacy backend is configured and can be used during the rewrite.';
$string['legacybackendnotconfigured'] = 'No legacy backend URL is configured yet.';
$string['healthreachable'] = 'Reachable';
$string['healthunreachable'] = 'Unreachable';
$string['hybridmodeenabled'] = 'Hybrid mode is enabled. Moodle pages can coexist with the current Node and Electron services while we migrate feature by feature.';
$string['hybridmodedisabled'] = 'Hybrid mode is disabled. These pages currently represent the Moodle-native rewrite foundation only.';
$string['openlegacydashboard'] = 'Open legacy dashboard';
$string['openlegacybackend'] = 'Open legacy backend';
$string['legacydashboardmissing'] = 'No legacy frontend URL is configured.';
$string['legacybackendmissing'] = 'No legacy backend URL is configured.';
$string['legacyhealthmessage'] = 'Legacy backend response: {$a}';
$string['legacynotchecked'] = 'Legacy backend health has not been checked.';

$string['rewritepassheading'] = 'Current pass';
$string['rewritepassbody'] = 'Pass 1 creates the Moodle-native plugin, schema, settings, and page surfaces. Later passes will migrate exam execution, room control, attempt tracking, and monitoring into Moodle-owned PHP services.';
$string['migrationstatus'] = 'Migration status';
$string['migrationstatusdesc'] = 'This plugin is the first pass of the rewrite. It does not yet replace the Electron desktop controls or the AI service, but it establishes the native Moodle data model and admin entry points.';
$string['nativefoundationready'] = 'Native foundation ready';

$string['settingsheading'] = 'Rewrite settings';
$string['settingsdesc'] = 'These settings let Moodle operate in hybrid mode while the legacy services are being replaced.';
$string['enablehybridmode'] = 'Enable hybrid mode';
$string['enablehybridmode_desc'] = 'When enabled, Moodle pages may point to the existing backend and frontend during the rewrite.';
$string['legacybackendurl'] = 'Legacy backend URL';
$string['legacybackendurl_desc'] = 'Base URL for the current Fastify backend, for example http://localhost:5000.';
$string['legacyfrontendurl'] = 'Legacy teacher dashboard URL';
$string['legacyfrontendurl_desc'] = 'Base URL for the current Next.js teacher dashboard, for example http://localhost:3000.';
$string['legacyaiurl'] = 'Legacy AI service URL';
$string['legacyaiurl_desc'] = 'Base URL for the current AI proctoring service, for example http://localhost:8000.';
$string['studentlaunchmode'] = 'Student launch mode';
$string['studentlaunchmode_desc'] = 'Choose how students should be launched during the rewrite.';
$string['launchmodehybrid'] = 'Hybrid Electron launch';
$string['launchmodemoodle'] = 'Moodle-native launch';

$string['nativeexamregistry'] = 'Native exam registry';
$string['nativeroomregistry'] = 'Native room registry';
$string['launchguidance'] = 'Launch guidance';
$string['launchguidancebody'] = 'This page is the Moodle-owned student launch surface. In hybrid mode it can still hand off to the Electron client or legacy services while we replace them.';
$string['launchmodeselected'] = 'Configured launch mode: {$a}';
$string['electronlimitation'] = 'Important: browser pages cannot take full desktop control the way Electron currently does. Matching those controls will require browser-compatible replacements such as Safe Exam Browser, Moodle quiz access rules, or institution-managed device policy.';

$string['examname'] = 'Exam';
$string['course'] = 'Course';
$string['status'] = 'Status';
$string['owner'] = 'Owner';
$string['student'] = 'Student';
$string['warningcount'] = 'Warnings';
$string['severity'] = 'Severity';
$string['detail'] = 'Detail';
$string['timecreated'] = 'Created';
$string['timestarted'] = 'Started';

$string['moodlenextsteps'] = 'Suggested next pass';
$string['moodlenextstepsbody'] = 'Move teacher read APIs into Moodle external functions, then replace room creation, attempt lifecycle, and violation recording one slice at a time.';
