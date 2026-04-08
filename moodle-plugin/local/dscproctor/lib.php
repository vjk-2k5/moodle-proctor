<?php
defined('MOODLE_INTERNAL') || die();

function local_dscproctor_extend_navigation(global_navigation $navigation): void {
    if (!isloggedin() || isguestuser()) {
        return;
    }

    $systemcontext = context_system::instance();

    if (has_capability('local/dscproctor:viewdashboard', $systemcontext)) {
        $navigation->add(
            get_string('pluginname', 'local_dscproctor'),
            new moodle_url('/local/dscproctor/index.php'),
            navigation_node::TYPE_CUSTOM,
            null,
            'local_dscproctor_dashboard'
        );
    }

    if (has_capability('local/dscproctor:launchstudent', $systemcontext)) {
        $navigation->add(
            get_string('studentlaunch', 'local_dscproctor'),
            new moodle_url('/local/dscproctor/student_launch.php'),
            navigation_node::TYPE_CUSTOM,
            null,
            'local_dscproctor_student_launch'
        );
    }
}
