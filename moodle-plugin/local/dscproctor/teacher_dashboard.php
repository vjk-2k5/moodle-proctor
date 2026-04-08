<?php
require_once(__DIR__ . '/../../../config.php');

use local_dscproctor\local\legacy_backend_client;
use local_dscproctor\local\repository;

$systemcontext = context_system::instance();
require_login();
require_capability('local/dscproctor:viewdashboard', $systemcontext);

$PAGE->set_url(new moodle_url('/local/dscproctor/teacher_dashboard.php'));
$PAGE->set_context($systemcontext);
$PAGE->set_pagelayout('report');
$PAGE->set_title(get_string('teacherdashboardheading', 'local_dscproctor'));
$PAGE->set_heading(get_string('teacherdashboard', 'local_dscproctor'));

$repository = new repository();
$legacyclient = new legacy_backend_client();
$settings = $legacyclient->get_settings_summary();
$counts = $repository->get_counts();
$exams = $repository->get_registered_exams();
$attempts = $repository->get_recent_attempts();
$violations = $repository->get_recent_violations();

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('teacherdashboardheading', 'local_dscproctor'));

echo html_writer::div(get_string('rewritepassbody', 'local_dscproctor'), 'generalbox');

$summary = new html_table();
$summary->head = [
    get_string('registeredexams', 'local_dscproctor'),
    get_string('attempts', 'local_dscproctor'),
    get_string('activeattempts', 'local_dscproctor'),
    get_string('violations', 'local_dscproctor'),
];
$summary->data[] = [
    $counts['exams'],
    $counts['attempts'],
    $counts['activeattempts'],
    $counts['violations'],
];
echo html_writer::table($summary);

echo $OUTPUT->heading(get_string('nativeexamregistry', 'local_dscproctor'), 3);
if (!$exams) {
    echo $OUTPUT->notification(get_string('noexams', 'local_dscproctor'), \core\output\notification::NOTIFY_INFO);
} else {
    $examtable = new html_table();
    $examtable->head = [
        get_string('examname', 'local_dscproctor'),
        get_string('course', 'local_dscproctor'),
        get_string('status', 'local_dscproctor'),
        get_string('warningcount', 'local_dscproctor'),
        get_string('timecreated', 'local_dscproctor'),
    ];
    foreach ($exams as $exam) {
        $examtable->data[] = [
            format_string($exam->examname),
            format_string($exam->coursefullname ?? '-'),
            s($exam->status),
            (string) $exam->maxwarnings,
            userdate($exam->timecreated),
        ];
    }
    echo html_writer::table($examtable);
}

echo $OUTPUT->heading(get_string('recentattempts', 'local_dscproctor'), 3);
if (!$attempts) {
    echo $OUTPUT->notification(get_string('noattempts', 'local_dscproctor'), \core\output\notification::NOTIFY_INFO);
} else {
    $attempttable = new html_table();
    $attempttable->head = [
        get_string('student', 'local_dscproctor'),
        get_string('examname', 'local_dscproctor'),
        get_string('status', 'local_dscproctor'),
        get_string('warningcount', 'local_dscproctor'),
        get_string('timestarted', 'local_dscproctor'),
    ];
    foreach ($attempts as $attempt) {
        $studentname = fullname((object) [
            'firstname' => $attempt->firstname,
            'lastname' => $attempt->lastname,
            'username' => $attempt->username,
        ]);
        $attempttable->data[] = [
            s($studentname),
            format_string($attempt->examname),
            s($attempt->status),
            (string) $attempt->warningcount,
            $attempt->timestarted ? userdate($attempt->timestarted) : '-',
        ];
    }
    echo html_writer::table($attempttable);
}

echo $OUTPUT->heading(get_string('recentviolations', 'local_dscproctor'), 3);
if (!$violations) {
    echo $OUTPUT->notification(get_string('noviolationrecords', 'local_dscproctor'), \core\output\notification::NOTIFY_INFO);
} else {
    $violationtable = new html_table();
    $violationtable->head = [
        get_string('student', 'local_dscproctor'),
        get_string('examname', 'local_dscproctor'),
        get_string('severity', 'local_dscproctor'),
        get_string('detail', 'local_dscproctor'),
        get_string('timecreated', 'local_dscproctor'),
    ];
    foreach ($violations as $violation) {
        $studentname = fullname((object) [
            'firstname' => $violation->firstname,
            'lastname' => $violation->lastname,
            'username' => $violation->username,
        ]);
        $violationtable->data[] = [
            s($studentname),
            format_string($violation->examname),
            s($violation->severity),
            s($violation->detail ?: $violation->violationtype),
            userdate($violation->timecreated),
        ];
    }
    echo html_writer::table($violationtable);
}

echo $OUTPUT->heading(get_string('legacyintegration', 'local_dscproctor'), 3);
echo html_writer::start_tag('ul');
echo html_writer::tag('li', get_string('launchmodeselected', 'local_dscproctor', s($settings['studentlaunchmode'])));
if (!empty($settings['legacyfrontendurl'])) {
    echo html_writer::tag('li', html_writer::link($settings['legacyfrontendurl'], get_string('openlegacydashboard', 'local_dscproctor')));
}
if (!empty($settings['legacybackendurl'])) {
    echo html_writer::tag('li', html_writer::link($settings['legacybackendurl'], get_string('openlegacybackend', 'local_dscproctor')));
}
echo html_writer::end_tag('ul');

echo $OUTPUT->footer();
