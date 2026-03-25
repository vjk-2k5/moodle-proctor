import { useState, useEffect, useCallback, useRef } from "react";
import { students } from "@mock/data";
import type { Alert } from "@app-types/index";
import { FiAlertTriangle, FiMic, FiMonitor, FiSmartphone } from "react-icons/fi";

interface Props {
  roomId?: number; // Room ID for SSE filtering
  apiUrl?: string; // Backend API URL
}

const alertIcon = (type: Alert["type"]) => {
  switch (type) {
    case "multiple_faces":
      return <FiAlertTriangle className="h-4 w-4 text-red-600" />;
    case "phone_detected":
      return <FiSmartphone className="h-4 w-4 text-amber-600" />;
    case "left_screen":
      return <FiMonitor className="h-4 w-4 text-red-600" />;
    case "background_voice":
      return <FiMic className="h-4 w-4 text-blue-600" />;
  }
};

const severityPill = (severity: Alert["severity"]) => {
  if (severity === "high") {
    return "bg-red-100 text-red-700 border-red-300";
  }
  if (severity === "medium") {
    return "bg-amber-100 text-amber-700 border-amber-300";
  }
  return "bg-blue-100 text-blue-700 border-blue-300";
};

export const AlertPanel = ({ roomId, apiUrl = 'http://localhost:3000' }: Props) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Exponential backoff for reconnection
  const getReconnectDelay = (attempt: number) => {
    return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
  };

  // Convert SSE violation event to Alert
  const convertSSEToAlert = useCallback((sseEvent: any): Alert | null => {
    if (!sseEvent.data) return null;

    try {
      const data = typeof sseEvent.data === 'string' ? JSON.parse(sseEvent.data) : sseEvent.data;

      // Map violation types to Alert types
      const typeMapping: Record<string, Alert["type"]> = {
        'multiple_faces': 'multiple_faces',
        'phone_detected': 'phone_detected',
        'left_screen': 'left_screen',
        'background_voice': 'background_voice',
      };

      // Map severity
      const severityMapping: Record<string, Alert["severity"]> = {
        'high': 'high',
        'medium': 'medium',
        'low': 'low',
      };

      const violationType = data.violations?.[0] || 'unknown';
      const alertType = typeMapping[violationType] || 'multiple_faces';
      const severity = severityMapping[data.severity] || 'medium';

      return {
        id: `${data.attemptId}-${Date.now()}`,
        studentId: data.attemptId?.toString() || 'unknown',
        type: alertType,
        message: data.details?.message || violationType.replace(/_/g, ' '),
        severity,
        timestamp: new Date(data.timestamp || Date.now()).toLocaleTimeString(),
      };
    } catch (error) {
      console.error('Failed to parse SSE event:', error);
      return null;
    }
  }, []);

  // Setup SSE connection
  useEffect(() => {
    if (!roomId) {
      console.log('[AlertPanel] No roomId provided, using mock data');
      return;
    }

    const connect = () => {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const token = localStorage.getItem('token');
      const url = `${apiUrl}/api/teacher/events?room_id=${roomId}`;

      console.log(`[AlertPanel] Connecting to SSE: ${url}`);

      const eventSource = new EventSource(url, {
        withCredentials: true,
      });

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[AlertPanel] SSE connected');
        setIsConnected(true);
        setReconnectAttempts(0);
      };

      eventSource.addEventListener('violation', (event) => {
        const alert = convertSSEToAlert(event);
        if (alert) {
          setAlerts((prev) => [alert, ...prev].slice(0, 50)); // Keep last 50 alerts
        }
      });

      eventSource.addEventListener('student_joined', (event) => {
        console.log('[AlertPanel] Student joined:', event.data);
      });

      eventSource.addEventListener('student_left', (event) => {
        console.log('[AlertPanel] Student left:', event.data);
      });

      eventSource.addEventListener('student_warned', (event) => {
        console.log('[AlertPanel] Student warned:', event.data);
      });

      eventSource.addEventListener('student_kicked', (event) => {
        console.log('[AlertPanel] Student kicked:', event.data);
      });

      eventSource.addEventListener('heartbeat', () => {
        // Keep connection alive
      });

      eventSource.onerror = (error) => {
        console.error('[AlertPanel] SSE error:', error);
        setIsConnected(false);

        if (eventSource.readyState === EventSource.CLOSED) {
          // Attempt to reconnect with exponential backoff
          const delay = getReconnectDelay(reconnectAttempts);
          console.log(`[AlertPanel] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, delay);
        }
      };
    };

    connect();

    return () => {
      console.log('[AlertPanel] Cleanup');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [roomId, apiUrl, reconnectAttempts, convertSSEToAlert]);

  return (
    <aside className="bg-white rounded-lg flex flex-col h-full max-h-[600px] border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-blue-50">
        <div className="flex items-center gap-3">
          <FiAlertTriangle className="h-5 w-5 text-amber-600" />
          <div className="flex flex-col">
            <h2 className="text-base font-bold text-gray-900">
              AI Alerts
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              {roomId ? `Room ${roomId}` : 'Real-time anomalies during exam'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
            {alerts.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-thin px-4 py-3 space-y-3">
        {alerts.map((alert) => {
          const student = students.find((s) => s.id === alert.studentId);
          return (
            <div
              key={alert.id}
              className="flex items-start gap-3 rounded-lg bg-gray-50 border border-gray-200 p-3 hover:shadow-sm transition-shadow"
            >
              <div className="mt-0.5 flex-shrink-0">{alertIcon(alert.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">
                    {alert.message}
                  </p>
                  <span className="text-xs text-gray-500 whitespace-nowrap mt-0.5">
                    {alert.timestamp}
                  </span>
                </div>
                {student && (
                  <p className="text-xs text-gray-600 mt-2">
                    <span className="font-medium">{student.name}</span> · {student.id}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${severityPill(
                      alert.severity
                    )}`}
                  >
                    {alert.severity === "high"
                      ? "High"
                      : alert.severity === "medium"
                      ? "Medium"
                      : "Low"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {alerts.length === 0 && (
          <div className="text-center text-sm text-gray-500 py-8">
            {isConnected ? 'No alerts at the moment' : 'Connecting to alerts...'}
          </div>
        )}
      </div>
    </aside>
  );
};

