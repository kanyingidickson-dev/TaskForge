function getOpenApiSpec({ origin }) {
  const serverUrl = typeof origin === 'string' && origin.length > 0 ? origin : 'http://localhost:3000';

  return {
    openapi: '3.0.3',
    info: {
      title: 'TaskForge API',
      version: '1.0.0',
      description: 'TaskForge is a realtime team task tracker (HTTP + WebSocket).',
    },
    servers: [{ url: serverUrl }],
    tags: [
      { name: 'System' },
      { name: 'Auth' },
      { name: 'Me' },
      { name: 'Teams' },
      { name: 'Tasks' },
      { name: 'Comments' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                requestId: { type: 'string' },
                details: { type: 'object', additionalProperties: true },
              },
              required: ['code', 'message', 'requestId'],
            },
          },
          required: ['error'],
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
          },
          required: ['status'],
        },
        RegisterRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            password: { type: 'string', format: 'password' },
          },
          required: ['email', 'name', 'password'],
        },
        LoginRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' },
          },
          required: ['email', 'password'],
        },
        RefreshRequest: {
          type: 'object',
          properties: {
            refreshToken: { type: 'string' },
          },
          required: ['refreshToken'],
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                name: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
              required: ['id', 'email', 'name', 'createdAt', 'updatedAt'],
            },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
          required: ['user', 'accessToken', 'refreshToken'],
        },
        RefreshResponse: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
          required: ['accessToken', 'refreshToken'],
        },
        MeResponse: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                name: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
              required: ['id', 'email', 'name', 'createdAt', 'updatedAt'],
            },
          },
          required: ['user'],
        },
        CreateTeamRequest: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
          required: ['name'],
        },
        Team: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            createdByUserId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'name', 'createdByUserId', 'createdAt', 'updatedAt'],
        },
        CreateTeamResponse: {
          type: 'object',
          properties: {
            team: { $ref: '#/components/schemas/Team' },
          },
          required: ['team'],
        },
        ListMyTeamsResponse: {
          type: 'object',
          properties: {
            teams: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  team: { $ref: '#/components/schemas/Team' },
                  role: { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER'] },
                },
                required: ['team', 'role'],
              },
            },
          },
          required: ['teams'],
        },
        CreateTaskRequest: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'] },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
            dueAt: { type: 'string', format: 'date-time' },
            assigneeUserId: { type: 'string', format: 'uuid' },
          },
          required: ['title'],
        },

        UpdateTaskRequest: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'] },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
            dueAt: { type: 'string', format: 'date-time', nullable: true },
            assigneeUserId: { type: 'string', format: 'uuid', nullable: true },
          },
          additionalProperties: false,
        },

        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            teamId: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'] },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
            dueAt: { type: 'string', format: 'date-time', nullable: true },
            assigneeUserId: { type: 'string', format: 'uuid', nullable: true },
            createdBy: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                name: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
              required: ['id', 'email', 'name', 'createdAt', 'updatedAt'],
            },
            assignee: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                name: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
              required: ['id', 'email', 'name', 'createdAt', 'updatedAt'],
            },
            createdByUserId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          required: [
            'id',
            'teamId',
            'title',
            'status',
            'priority',
            'createdByUserId',
            'createdAt',
            'updatedAt',
          ],
        },

        CreateTaskResponse: {
          type: 'object',
          properties: {
            task: { $ref: '#/components/schemas/Task' },
          },
          required: ['task'],
        },

        ListTasksResponse: {
          type: 'object',
          properties: {
            tasks: {
              type: 'array',
              items: { $ref: '#/components/schemas/Task' },
            },
          },
          required: ['tasks'],
        },

        CreateCommentRequest: {
          type: 'object',
          properties: {
            body: { type: 'string' },
          },
          required: ['body'],
        },

        Comment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            taskId: { type: 'string', format: 'uuid' },
            teamId: { type: 'string', format: 'uuid' },
            authorUserId: { type: 'string', format: 'uuid' },
            author: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                name: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
              required: ['id', 'email', 'name', 'createdAt', 'updatedAt'],
            },
            body: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
          required: ['id', 'taskId', 'teamId', 'authorUserId', 'body', 'createdAt', 'updatedAt'],
        },

        CreateCommentResponse: {
          type: 'object',
          properties: {
            comment: { $ref: '#/components/schemas/Comment' },
          },
          required: ['comment'],
        },

        ListCommentsResponse: {
          type: 'object',
          properties: {
            comments: {
              type: 'array',
              items: { $ref: '#/components/schemas/Comment' },
            },
          },
          required: ['comments'],
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Health check',
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
          },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthResponse' },
                },
              },
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthResponse' },
                },
              },
            },
            400: {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RefreshRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/RefreshResponse' },
                },
              },
            },
          },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout (revoke refresh token)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RefreshRequest' },
              },
            },
          },
          responses: {
            204: { description: 'No Content' },
          },
        },
      },
      '/me': {
        get: {
          tags: ['Me'],
          summary: 'Get current user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/MeResponse' },
                },
              },
            },
            401: {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorResponse' },
                },
              },
            },
          },
        },
      },
      '/teams': {
        get: {
          tags: ['Teams'],
          summary: 'List teams for current user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ListMyTeamsResponse' },
                },
              },
            },
          },
        },
        post: {
          tags: ['Teams'],
          summary: 'Create team',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateTeamRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CreateTeamResponse' },
                },
              },
            },
          },
        },
      },

      '/teams/{teamId}/members': {
        get: {
          tags: ['Teams'],
          summary: 'List team members',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'OK' },
          },
        },
        post: {
          tags: ['Teams'],
          summary: 'Add team member',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string', format: 'uuid' },
                    role: { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER'] },
                  },
                  required: ['userId', 'role'],
                },
              },
            },
          },
          responses: {
            201: { description: 'Created' },
          },
        },
      },

      '/teams/{teamId}/members/{userId}': {
        patch: {
          tags: ['Teams'],
          summary: 'Update team member role',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    role: { type: 'string', enum: ['OWNER', 'ADMIN', 'MEMBER'] },
                  },
                  required: ['role'],
                },
              },
            },
          },
          responses: {
            200: { description: 'OK' },
          },
        },
        delete: {
          tags: ['Teams'],
          summary: 'Remove team member',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            204: { description: 'No Content' },
          },
        },
      },

      '/teams/{teamId}/tasks': {
        get: {
          tags: ['Tasks'],
          summary: 'List tasks for a team',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ListTasksResponse' },
                },
              },
            },
          },
        },
        post: {
          tags: ['Tasks'],
          summary: 'Create task in a team',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateTaskRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CreateTaskResponse' },
                },
              },
            },
          },
        },
      },

      '/teams/{teamId}/tasks/{taskId}': {
        patch: {
          tags: ['Tasks'],
          summary: 'Update a task',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'taskId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateTaskRequest' },
              },
            },
          },
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CreateTaskResponse' },
                },
              },
            },
          },
        },
      },

      '/teams/{teamId}/tasks/{taskId}/comments': {
        get: {
          tags: ['Comments'],
          summary: 'List task comments',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'taskId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ListCommentsResponse' },
                },
              },
            },
          },
        },
        post: {
          tags: ['Comments'],
          summary: 'Create task comment',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'taskId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateCommentRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CreateCommentResponse' },
                },
              },
            },
          },
        },
      },

      '/teams/{teamId}/tasks/{taskId}/comments/{commentId}': {
        delete: {
          tags: ['Comments'],
          summary: 'Delete a comment (soft-delete)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'teamId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'taskId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'commentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            204: { description: 'No Content' },
          },
        },
      },
    },
  };
}

module.exports = { getOpenApiSpec };
