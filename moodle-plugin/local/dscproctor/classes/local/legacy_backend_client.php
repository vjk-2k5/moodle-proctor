<?php
namespace local_dscproctor\local;

defined('MOODLE_INTERNAL') || die();

class legacy_backend_client {
    public function get_settings_summary(): array {
        return [
            'hybridmode' => (bool) get_config('local_dscproctor', 'enablehybridmode'),
            'legacybackendurl' => $this->normalise_url((string) get_config('local_dscproctor', 'legacybackendurl')),
            'legacyfrontendurl' => $this->normalise_url((string) get_config('local_dscproctor', 'legacyfrontendurl')),
            'legacyaiurl' => $this->normalise_url((string) get_config('local_dscproctor', 'legacyaiurl')),
            'studentlaunchmode' => (string) get_config('local_dscproctor', 'studentlaunchmode'),
        ];
    }

    public function get_health_status(): array {
        global $CFG;

        $settings = $this->get_settings_summary();

        if (empty($settings['legacybackendurl'])) {
            return [
                'configured' => false,
                'reachable' => false,
                'status' => 'not-configured',
                'message' => get_string('legacybackendnotconfigured', 'local_dscproctor'),
            ];
        }

        require_once($CFG->libdir . '/filelib.php');

        $curl = new \curl();
        $healthurl = $settings['legacybackendurl'] . '/health';

        try {
            $response = $curl->get($healthurl, [], ['CURLOPT_TIMEOUT' => 3]);

            if ($curl->get_errno()) {
                return [
                    'configured' => true,
                    'reachable' => false,
                    'status' => 'error',
                    'message' => $curl->error,
                ];
            }

            $payload = json_decode($response, true);
            $status = is_array($payload) && !empty($payload['status']) ? (string) $payload['status'] : 'ok';

            return [
                'configured' => true,
                'reachable' => true,
                'status' => $status,
                'message' => is_array($payload) ? json_encode($payload) : get_string('healthreachable', 'local_dscproctor'),
            ];
        } catch (\Throwable $exception) {
            return [
                'configured' => true,
                'reachable' => false,
                'status' => 'exception',
                'message' => $exception->getMessage(),
            ];
        }
    }

    private function normalise_url(string $url): string {
        $trimmed = trim($url);
        if ($trimmed === '') {
            return '';
        }

        return rtrim($trimmed, '/');
    }
}
