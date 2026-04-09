// ============================================================================
// WebRTC Routes
// REST endpoints for WebRTC signaling and room management
// ============================================================================

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { webrtcService } from './webrtc.service';
import logger from '../../config/logger';
import { authMiddleware } from '../../middleware/auth.middleware';
import type { DtlsParameters, RtpParameters } from 'mediasoup/node/lib/types';

function getAuthenticatedUser(request: FastifyRequest): {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
} {
  return (request as any).user as {
    id: number;
    firstName?: string;
    lastName?: string;
    username?: string;
  };
}

function getDisplayName(user: {
  firstName?: string;
  lastName?: string;
  username?: string;
}): string {
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return fullName || user.username || 'Unknown User';
}

// ============================================================================
// Route Handlers
// ============================================================================

export async function registerWebRTCRoutes(app: FastifyInstance) {
  /**
   * GET /api/webrtc/rooms/:roomId
   * Get room information
   */
  app.get<{ Params: { roomId: string } }>(
    '/api/webrtc/rooms/:roomId',
    {
      onRequest: [authMiddleware],
      schema: {
        params: {
          type: 'object',
          properties: {
            roomId: { type: 'string' },
          },
          required: ['roomId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { roomId } = request.params as { roomId: string };
        const roomInfo = webrtcService.getRoomInfo(roomId);

        if (!roomInfo) {
          return reply.status(404).send({
            error: 'Room not found',
          });
        }

        return reply.send(roomInfo);
      } catch (error) {
        logger.error('Error getting room info:', error);
        return reply.status(500).send({
          error: 'Failed to get room information',
        });
      }
    }
  );

  /**
   * POST /api/webrtc/rooms
   * Create new room
   */
  app.post<{ Body: { roomId: string; examId: number } }>(
    '/api/webrtc/rooms',
    {
      onRequest: [authMiddleware],
      schema: {
        body: {
          type: 'object',
          properties: {
            roomId: { type: 'string' },
            examId: { type: 'number' },
          },
          required: ['roomId', 'examId'],
        },
      },
    },
    async (request: FastifyRequest<{ Body: { roomId: string; examId: number } }>, reply: FastifyReply) => {
      try {
        const { roomId, examId } = request.body;

        await webrtcService.createRoom(roomId, examId);
        const roomInfo = webrtcService.getRoomInfo(roomId);

        return reply.status(201).send(roomInfo);
      } catch (error) {
        logger.error('Error creating room:', error);
        return reply.status(500).send({
          error: 'Failed to create room',
        });
      }
    }
  );

  /**
   * POST /api/webrtc/rooms/:roomId/peers
   * Add peer to room and create transport
   */
  app.post<{ Params: { roomId: string }; Body: { peerId: string; studentName?: string } }>(
    '/api/webrtc/rooms/:roomId/peers',
    {
      onRequest: [authMiddleware],
      schema: {
        params: {
          type: 'object',
          properties: {
            roomId: { type: 'string' },
          },
          required: ['roomId'],
        },
        body: {
          type: 'object',
          properties: {
            peerId: { type: 'string' },
            studentName: { type: 'string' },
          },
          required: ['peerId'],
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { roomId: string }; Body: { peerId: string; studentName?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { roomId } = request.params;
        const { peerId, studentName } = request.body;
        const user = getAuthenticatedUser(request);
        const resolvedStudentName = studentName?.trim() || getDisplayName(user);

        await webrtcService.addPeer(roomId, peerId, user.id, resolvedStudentName);

        const transportParams = await webrtcService.createTransport(
          roomId,
          peerId
        );
        const routerRtpCapabilities = webrtcService.getRouterRtpCapabilities(roomId);

        return reply.status(201).send({
          peerId,
          userId: user.id,
          studentName: resolvedStudentName,
          transport: transportParams,
          routerRtpCapabilities,
        });
      } catch (error) {
        logger.error('Error adding peer:', error);
        return reply.status(500).send({
          error: 'Failed to add peer',
        });
      }
    }
  );

  /**
   * POST /api/webrtc/rooms/:roomId/peers/:peerId/connect-transport
   * Connect peer transport with DTLS parameters
   */
  app.post<{
    Params: { roomId: string; peerId: string };
    Body: { dtlsParameters: DtlsParameters };
  }>(
    '/api/webrtc/rooms/:roomId/peers/:peerId/connect-transport',
    {
      onRequest: [authMiddleware],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { roomId, peerId } = request.params as {
          roomId: string;
          peerId: string;
        };
        const { dtlsParameters } = request.body as { dtlsParameters: DtlsParameters };
        const peer = webrtcService.getPeer(roomId, peerId);
        const user = getAuthenticatedUser(request);

        if (!peer || peer.userId !== user.id) {
          return reply.status(403).send({
            error: 'Peer does not belong to authenticated user',
          });
        }

        await webrtcService.connectTransport(
          roomId,
          peerId,
          dtlsParameters
        );

        return reply.send({ connected: true });
      } catch (error) {
        logger.error('Error connecting transport:', error);
        return reply.status(500).send({
          error: 'Failed to connect transport',
        });
      }
    }
  );

  /**
   * POST /api/webrtc/rooms/:roomId/peers/:peerId/produce
   * Create producer (stream from student)
   */
  app.post<{
    Params: { roomId: string; peerId: string };
    Body: { kind: 'audio' | 'video'; rtpParameters: RtpParameters };
  }>(
    '/api/webrtc/rooms/:roomId/peers/:peerId/produce',
    {
      onRequest: [authMiddleware],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { roomId, peerId } = request.params as {
          roomId: string;
          peerId: string;
        };
        const { kind, rtpParameters } = request.body as {
          kind: 'audio' | 'video';
          rtpParameters: RtpParameters;
        };
        const peer = webrtcService.getPeer(roomId, peerId);
        const user = getAuthenticatedUser(request);

        if (!peer || peer.userId !== user.id) {
          return reply.status(403).send({
            error: 'Peer does not belong to authenticated user',
          });
        }

        const producer = await webrtcService.createProducer(
          roomId,
          peerId,
          kind,
          rtpParameters
        );

        return reply.status(201).send({
          producerId: producer.id,
        });
      } catch (error) {
        logger.error('Error creating producer:', error);
        return reply.status(500).send({
          error: 'Failed to create producer',
        });
      }
    }
  );

  /**
   * GET /api/webrtc/rooms/:roomId/peers/:peerId/consumers
   * Get available consumers for peer
   */
  app.get<{ Params: { roomId: string; peerId: string } }>(
    '/api/webrtc/rooms/:roomId/peers/:peerId/consumers',
    {
      onRequest: [authMiddleware],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { roomId, peerId } = request.params as {
          roomId: string;
          peerId: string;
        };

        const consumers = await webrtcService.getConsumers(roomId, peerId);

        return reply.send({ consumers });
      } catch (error) {
        logger.error('Error getting consumers:', error);
        return reply.status(500).send({
          error: 'Failed to get consumers',
        });
      }
    }
  );

  /**
   * POST /api/webrtc/rooms/:roomId/peers/:peerId/consume
   * Create consumer for peer
   */
  app.post<{
    Params: { roomId: string; peerId: string };
    Body: { producerId: string; rtpCapabilities: RtpParameters };
  }>(
    '/api/webrtc/rooms/:roomId/peers/:peerId/consume',
    {
      onRequest: [authMiddleware],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { roomId, peerId } = request.params as {
          roomId: string;
          peerId: string;
        };
        const { producerId, rtpCapabilities } = request.body as {
          producerId: string;
          rtpCapabilities: RtpParameters;
        };
        const peer = webrtcService.getPeer(roomId, peerId);
        const user = getAuthenticatedUser(request);

        if (!peer || peer.userId !== user.id) {
          return reply.status(403).send({
            error: 'Peer does not belong to authenticated user',
          });
        }

        const consumer = await webrtcService.createConsumer(
          roomId,
          peerId,
          producerId,
          rtpCapabilities
        );

        return reply.status(201).send({
          consumerId: consumer.id,
          id: consumer.id,
          producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        });
      } catch (error) {
        logger.error('Error creating consumer:', error);
        return reply.status(500).send({
          error: 'Failed to create consumer',
        });
      }
    }
  );

  /**
   * POST /api/webrtc/rooms/:roomId/peers/:peerId/consumers/:producerId/resume
   * Resume consumer
   */
  app.post<{ Params: { roomId: string; peerId: string; producerId: string } }>(
    '/api/webrtc/rooms/:roomId/peers/:peerId/consumers/:producerId/resume',
    {
      onRequest: [authMiddleware],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { roomId, peerId, producerId } = request.params as {
          roomId: string;
          peerId: string;
          producerId: string;
        };
        const peer = webrtcService.getPeer(roomId, peerId);
        const user = getAuthenticatedUser(request);

        if (!peer || peer.userId !== user.id) {
          return reply.status(403).send({
            error: 'Peer does not belong to authenticated user',
          });
        }

        await webrtcService.resumeConsumer(roomId, peerId, producerId);

        return reply.send({ resumed: true });
      } catch (error) {
        logger.error('Error resuming consumer:', error);
        return reply.status(500).send({
          error: 'Failed to resume consumer',
        });
      }
    }
  );

  /**
   * DELETE /api/webrtc/rooms/:roomId/peers/:peerId
   * Remove peer from room
   */
  app.delete<{ Params: { roomId: string; peerId: string } }>(
    '/api/webrtc/rooms/:roomId/peers/:peerId',
    {
      onRequest: [authMiddleware],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { roomId, peerId } = request.params as {
          roomId: string;
          peerId: string;
        };
        const peer = webrtcService.getPeer(roomId, peerId);
        const user = getAuthenticatedUser(request);

        if (!peer || peer.userId !== user.id) {
          return reply.status(403).send({
            error: 'Peer does not belong to authenticated user',
          });
        }

        await webrtcService.removePeer(roomId, peerId);

        return reply.send({ removed: true });
      } catch (error) {
        logger.error('Error removing peer:', error);
        return reply.status(500).send({
          error: 'Failed to remove peer',
        });
      }
    }
  );
}

export default registerWebRTCRoutes;
