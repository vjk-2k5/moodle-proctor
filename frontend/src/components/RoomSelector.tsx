"use client";

import { useEffect, useState } from "react";
import { FiClock, FiLoader, FiUsers, FiX } from "react-icons/fi";

export interface ProctoringRoomSummary {
  id: number;
  roomCode: string;
  examName: string;
  studentCount: number;
  durationMinutes: number;
  createdAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentRoomCode?: string;
  onRoomSelect: (room: ProctoringRoomSummary) => void;
  apiUrl?: string;
}

export const RoomSelector = ({
  isOpen,
  onClose,
  currentRoomCode,
  onRoomSelect,
  apiUrl = "http://localhost:5000"
}: Props) => {
  const [rooms, setRooms] = useState<ProctoringRoomSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchRooms = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/api/room/active`, {
          credentials: "include"
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to fetch rooms");
        }

        setRooms(result.data);
      } catch (err) {
        console.error("[RoomSelector] Error fetching rooms:", err);
        setError(err instanceof Error ? err.message : "Failed to load rooms");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRooms();
  }, [apiUrl, isOpen]);

  const handleRoomSelect = (room: ProctoringRoomSummary) => {
    if (room.roomCode === currentRoomCode) {
      onClose();
      return;
    }

    setIsSwitching(true);

    setTimeout(() => {
      onRoomSelect(room);
      setIsSwitching(false);
      onClose();
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[80vh] w-full max-w-2xl mx-4 flex flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Select Proctoring Room</h2>
            <p className="mt-0.5 text-sm text-gray-600">Choose a room to monitor</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
            disabled={isSwitching}
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <FiLoader className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading rooms...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-red-600">{error}</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              No active rooms found yet. Create a room to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => {
                const isCurrentRoom = room.roomCode === currentRoomCode;

                return (
                  <button
                    key={room.id}
                    onClick={() => handleRoomSelect(room)}
                    disabled={isSwitching}
                    className={[
                      "w-full rounded-lg border-2 p-4 text-left transition-all",
                      isCurrentRoom
                        ? "cursor-default border-blue-500 bg-blue-50"
                        : "cursor-pointer border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50",
                      isSwitching ? "cursor-wait opacity-50" : ""
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900">{room.examName}</h3>
                          {isCurrentRoom ? (
                            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
                              Current
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <FiUsers className="h-4 w-4" />
                            <span>{room.studentCount} students</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FiClock className="h-4 w-4" />
                            <span>{room.durationMinutes} min</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Code: <span className="font-mono font-medium">{room.roomCode}</span>
                          </div>
                        </div>
                      </div>
                      {isSwitching && !isCurrentRoom ? (
                        <FiLoader className="h-5 w-5 animate-spin text-blue-600" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
