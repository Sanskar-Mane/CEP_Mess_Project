import { io } from 'socket.io-client';
import { API_URL } from './config';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
};

export default getSocket;
