<?php
defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $settings = new admin_settingpage(
        'local_dscproctor',
        get_string('pluginname', 'local_dscproctor')
    );

    $settings->add(new admin_setting_heading(
        'local_dscproctor/settingsheading',
        get_string('settingsheading', 'local_dscproctor'),
        get_string('settingsdesc', 'local_dscproctor')
    ));

    $settings->add(new admin_setting_configcheckbox(
        'local_dscproctor/enablehybridmode',
        get_string('enablehybridmode', 'local_dscproctor'),
        get_string('enablehybridmode_desc', 'local_dscproctor'),
        1
    ));

    $settings->add(new admin_setting_configtext(
        'local_dscproctor/legacybackendurl',
        get_string('legacybackendurl', 'local_dscproctor'),
        get_string('legacybackendurl_desc', 'local_dscproctor'),
        '',
        PARAM_URL
    ));

    $settings->add(new admin_setting_configtext(
        'local_dscproctor/legacyfrontendurl',
        get_string('legacyfrontendurl', 'local_dscproctor'),
        get_string('legacyfrontendurl_desc', 'local_dscproctor'),
        '',
        PARAM_URL
    ));

    $settings->add(new admin_setting_configtext(
        'local_dscproctor/legacyaiurl',
        get_string('legacyaiurl', 'local_dscproctor'),
        get_string('legacyaiurl_desc', 'local_dscproctor'),
        '',
        PARAM_URL
    ));

    $settings->add(new admin_setting_configselect(
        'local_dscproctor/studentlaunchmode',
        get_string('studentlaunchmode', 'local_dscproctor'),
        get_string('studentlaunchmode_desc', 'local_dscproctor'),
        'hybrid_electron',
        [
            'hybrid_electron' => get_string('launchmodehybrid', 'local_dscproctor'),
            'moodle_native' => get_string('launchmodemoodle', 'local_dscproctor'),
        ]
    ));

    $ADMIN->add('localplugins', $settings);
}
