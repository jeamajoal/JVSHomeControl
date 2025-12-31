import { io } from 'socket.io-client';

import { API_HOST } from './apiHost';

// Shared singleton socket for the client app.
export const socket = io(API_HOST);
