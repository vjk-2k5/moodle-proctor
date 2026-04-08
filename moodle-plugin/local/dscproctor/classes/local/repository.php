<?php
namespace local_dscproctor\local;

defined('MOODLE_INTERNAL') || die();

class repository {
    public function get_counts(): array {
        global $DB;

        return [
            'exams' => $DB->count_records('local_dscproctor_exam'),
            'rooms' => $DB->count_records('local_dscproctor_room'),
            'attempts' => $DB->count_records('local_dscproctor_attempt'),
            'activeattempts' => $DB->count_records('local_dscproctor_attempt', ['status' => 'in_progress']),
            'violations' => $DB->count_records('local_dscproctor_violation'),
        ];
    }

    public function get_registered_exams(int $limit = 20): array {
        global $DB;

        $sql = "SELECT e.id,
                       e.examname,
                       e.status,
                       e.durationminutes,
                       e.maxwarnings,
                       c.fullname AS coursefullname,
                       e.timecreated
                  FROM {local_dscproctor_exam} e
             LEFT JOIN {course} c
                    ON c.id = e.courseid
              ORDER BY e.timemodified DESC, e.id DESC";

        return $DB->get_records_sql($sql, [], 0, $limit);
    }

    public function get_open_rooms(int $limit = 20): array {
        global $DB;

        $sql = "SELECT r.id,
                       r.roomcode,
                       r.status,
                       r.timecreated,
                       e.examname,
                       u.firstname,
                       u.lastname,
                       u.username
                  FROM {local_dscproctor_room} r
                  JOIN {local_dscproctor_exam} e
                    ON e.id = r.examid
             LEFT JOIN {user} u
                    ON u.id = r.owneruserid
              ORDER BY r.timemodified DESC, r.id DESC";

        return $DB->get_records_sql($sql, [], 0, $limit);
    }

    public function get_recent_attempts(int $limit = 10): array {
        global $DB;

        $sql = "SELECT a.id,
                       a.status,
                       a.warningcount,
                       a.timestarted,
                       a.timecreated,
                       e.examname,
                       u.firstname,
                       u.lastname,
                       u.username
                  FROM {local_dscproctor_attempt} a
                  JOIN {local_dscproctor_exam} e
                    ON e.id = a.examid
                  JOIN {user} u
                    ON u.id = a.userid
              ORDER BY a.timemodified DESC, a.id DESC";

        return $DB->get_records_sql($sql, [], 0, $limit);
    }

    public function get_recent_violations(int $limit = 10): array {
        global $DB;

        $sql = "SELECT v.id,
                       v.violationtype,
                       v.severity,
                       v.detail,
                       v.timecreated,
                       e.examname,
                       u.firstname,
                       u.lastname,
                       u.username
                  FROM {local_dscproctor_violation} v
                  JOIN {local_dscproctor_attempt} a
                    ON a.id = v.attemptid
                  JOIN {local_dscproctor_exam} e
                    ON e.id = a.examid
                  JOIN {user} u
                    ON u.id = a.userid
              ORDER BY v.timecreated DESC, v.id DESC";

        return $DB->get_records_sql($sql, [], 0, $limit);
    }
}
