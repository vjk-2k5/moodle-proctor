<?php
require_once(__DIR__ . '/../../../config.php');

use local_dscproctor\local\legacy_backend_client;
use local_dscproctor\local\repository;

$systemcontext = context_system::instance();
require_login();
require_capability('local/dscproctor:viewdashboard', $systemcontext);

$pageurl = new moodle_url('/local/dscproctor/index.php');
$PAGE->set_url($pageurl);
$PAGE->set_context($systemcontext);
$PAGE->set_pagelayout('report');
$PAGE->set_title(get_string('dashboardheading', 'local_dscproctor'));
$PAGE->set_heading(get_string('pluginname', 'local_dscproctor'));

$repository = new repository();
$counts = $repository->get_counts();
$legacyclient = new legacy_backend_client();
$settings = $legacyclient->get_settings_summary();
$health = $legacyclient->get_health_status();

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('dashboardheading', 'local_dscproctor'));

if ($settings['hybridmode']) {
    echo $OUTPUT->notification(get_string('hybridmodeenabled', 'local_dscproctor'), \core\output\notification::NOTIFY_INFO);
} else {
    echo $OUTPUT->notification(get_string('hybridmodedisabled', 'local_dscproctor'), \core\output\notification::NOTIFY_WARNING);
}

echo html_writer::div(get_string('migrationstatusdesc', 'local_dscproctor'), 'alert alert-secondary');

$cards = [
    ['label' => get_string('registeredexams', 'local_dscproctor'), 'value' => $counts['exams']],
    ['label' => get_string('openrooms', 'local_dscproctor'), 'value' => $counts['rooms']],
    ['label' => get_string('attempts', 'local_dscproctor'), 'value' => $counts['attempts']],
    ['label' => get_string('activeattempts', 'local_dscproctor'), 'value' => $counts['activeattempts']],
    ['label' => get_string('violations', 'local_dscproctor'), 'value' => $counts['violations']],
];

echo html_writer::start_div('', [
    'style' => 'display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin:20px 0;',
]);
foreach ($cards as $card) {
    echo html_writer::start_div('generalbox', ['style' => 'margin:0;padding:16px;']);
    echo html_writer::div(format_string($card['label']), '', ['style' => 'font-size:0.9rem;color:#555;']);
    echo html_writer::div((string) $card['value'], '', ['style' => 'font-size:2rem;font-weight:700;']);
    echo html_writer::end_div();
}
echo html_writer::end_div();

echo html_writer::start_div('', ['style' => 'display:flex;gap:12px;flex-wrap:wrap;margin:20px 0;']);
echo $OUTPUT->render(new single_button(
    new moodle_url('/local/dscproctor/teacher_dashboard.php'),
    get_string('teacherdashboard', 'local_dscproctor'),
    'get'
));
echo $OUTPUT->render(new single_button(
    new moodle_url('/local/dscproctor/student_launch.php'),
    get_string('studentlaunch', 'local_dscproctor'),
    'get'
));
echo html_writer::end_div();

echo $OUTPUT->heading(get_string('legacyintegration', 'local_dscproctor'), 3);
if (!$health['configured']) {
    echo $OUTPUT->notification($health['message'], \core\output\notification::NOTIFY_WARNING);
} else if ($health['reachable']) {
    echo $OUTPUT->notification(
        get_string('legacyhealthmessage', 'local_dscproctor', s($health['message'])),
        \core\output\notification::NOTIFY_SUCCESS
    );
} else {
    echo $OUTPUT->notification(
        get_string('legacyhealthmessage', 'local_dscproctor', s($health['message'])),
        \core\output\notification::NOTIFY_WARNING
    );
}

echo html_writer::start_tag('ul');
if (!empty($settings['legacyfrontendurl'])) {
    echo html_writer::tag('li', html_writer::link($settings['legacyfrontendurl'], get_string('openlegacydashboard', 'local_dscproctor')));
} else {
    echo html_writer::tag('li', get_string('legacydashboardmissing', 'local_dscproctor'));
}
if (!empty($settings['legacybackendurl'])) {
    echo html_writer::tag('li', html_writer::link($settings['legacybackendurl'], get_string('openlegacybackend', 'local_dscproctor')));
} else {
    echo html_writer::tag('li', get_string('legacybackendmissing', 'local_dscproctor'));
}
echo html_writer::end_tag('ul');

echo $OUTPUT->heading(get_string('rewritepassheading', 'local_dscproctor'), 3);
echo html_writer::div(get_string('rewritepassbody', 'local_dscproctor'), 'generalbox');
echo html_writer::div(get_string('moodlenextstepsbody', 'local_dscproctor'), 'generalbox');

echo $OUTPUT->footer();
