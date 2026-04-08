<?php
require_once(__DIR__ . '/../../../config.php');

use local_dscproctor\local\legacy_backend_client;
use local_dscproctor\local\repository;

$systemcontext = context_system::instance();
require_login();
require_capability('local/dscproctor:launchstudent', $systemcontext);

$PAGE->set_url(new moodle_url('/local/dscproctor/student_launch.php'));
$PAGE->set_context($systemcontext);
$PAGE->set_pagelayout('standard');
$PAGE->set_title(get_string('studentlaunchheading', 'local_dscproctor'));
$PAGE->set_heading(get_string('studentlaunch', 'local_dscproctor'));

$repository = new repository();
$legacyclient = new legacy_backend_client();
$settings = $legacyclient->get_settings_summary();
$exams = $repository->get_registered_exams();
$rooms = $repository->get_open_rooms();

echo $OUTPUT->header();
echo $OUTPUT->heading(get_string('studentlaunchheading', 'local_dscproctor'));
echo $OUTPUT->notification(get_string('launchguidancebody', 'local_dscproctor'), \core\output\notification::NOTIFY_INFO);
echo $OUTPUT->notification(get_string('electronlimitation', 'local_dscproctor'), \core\output\notification::NOTIFY_WARNING);

echo html_writer::div(
    get_string('launchmodeselected', 'local_dscproctor', s($settings['studentlaunchmode'] ?: 'hybrid_electron')),
    'generalbox'
);

if (!empty($settings['legacyfrontendurl']) && !empty($settings['hybridmode'])) {
    echo html_writer::div(
        html_writer::link($settings['legacyfrontendurl'], get_string('openlegacydashboard', 'local_dscproctor')),
        'generalbox'
    );
}

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
    ];
    foreach ($exams as $exam) {
        $examtable->data[] = [
            format_string($exam->examname),
            format_string($exam->coursefullname ?? '-'),
            s($exam->status),
            (string) $exam->maxwarnings,
        ];
    }
    echo html_writer::table($examtable);
}

echo $OUTPUT->heading(get_string('nativeroomregistry', 'local_dscproctor'), 3);
if (!$rooms) {
    echo $OUTPUT->notification(get_string('norooms', 'local_dscproctor'), \core\output\notification::NOTIFY_INFO);
} else {
    $roomtable = new html_table();
    $roomtable->head = [
        get_string('examname', 'local_dscproctor'),
        get_string('owner', 'local_dscproctor'),
        get_string('status', 'local_dscproctor'),
        'Room code',
        get_string('timecreated', 'local_dscproctor'),
    ];
    foreach ($rooms as $room) {
        $ownername = fullname((object) [
            'firstname' => $room->firstname,
            'lastname' => $room->lastname,
            'username' => $room->username,
        ]);
        $roomtable->data[] = [
            format_string($room->examname),
            s($ownername),
            s($room->status),
            s($room->roomcode),
            userdate($room->timecreated),
        ];
    }
    echo html_writer::table($roomtable);
}

echo $OUTPUT->heading(get_string('moodlenextsteps', 'local_dscproctor'), 3);
echo html_writer::div(get_string('moodlenextstepsbody', 'local_dscproctor'), 'generalbox');

echo $OUTPUT->footer();
