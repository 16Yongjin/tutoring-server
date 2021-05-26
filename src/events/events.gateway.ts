import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets'
import { from, Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { Server, Socket } from 'socket.io'

@WebSocketGateway()
export class EventsGateway {
  @WebSocketServer()
  server: Server

  // async handleConnection(client: Socket) {
  //   console.log('handleConnection')
  //   client.emit('me', client.id)
  // }

  // async handleDisconnect(client: Socket) {
  //   console.log('disconnection')
  // }

  @SubscribeMessage('joinRoom')
  joinRoom(@MessageBody() roomId: string, @ConnectedSocket() client: Socket) {
    console.log('[joinRoom]', roomId)

    client.join(roomId)

    client.broadcast.to(roomId).emit('hasUser', client.id)
  }

  @SubscribeMessage('meToo')
  meToo(@MessageBody() { roomId }: any, @ConnectedSocket() client: Socket) {
    console.log('[me too]', roomId)

    client.join(roomId)

    client.broadcast.to(roomId).emit('hasUserToo', client.id)
  }

  @SubscribeMessage('startCall')
  startCall(
    @MessageBody() { userId, signal }: any,
    @ConnectedSocket() client: Socket
  ) {
    console.log('[startCall 받음]')

    client.to(userId).emit('startCall', { signal })
  }

  @SubscribeMessage('callUser')
  callUser(
    @MessageBody() { signal, roomId }: any,
    @ConnectedSocket() client: Socket
  ) {
    client.broadcast.to(roomId).emit('joinUser', { signal })
  }

  @SubscribeMessage('answerCall')
  answerCall(
    @MessageBody() { userId, signal }: any,
    @ConnectedSocket() client: Socket
  ) {
    console.log('[answerCall]', userId)
    client.to(userId).emit('callAccepted', signal)
  }

  @SubscribeMessage('urlChange')
  urlChange(
    @MessageBody() { roomId, pathname, hash, url }: any,
    @ConnectedSocket() client: Socket
  ) {
    console.log('[url change]', roomId)

    client.broadcast.to(roomId).emit('urlChange', { pathname, hash, url })
  }

  @SubscribeMessage('sendChat')
  sendChat(
    @MessageBody() { roomId, ...chatData }: any,
    @ConnectedSocket() client: Socket
  ) {
    console.log('[send chat]', chatData)

    this.server.to(roomId).emit('sendChat', chatData)
  }

  @SubscribeMessage('events')
  findAll(@MessageBody() data: any): Observable<WsResponse<number>> {
    return from([1, 2, 3]).pipe(
      map((item) => ({ event: 'events', data: item }))
    )
  }

  @SubscribeMessage('test')
  test(@MessageBody() data: any) {
    console.log('test', data)
  }

  @SubscribeMessage('identity')
  async identity(@MessageBody() data: number): Promise<number> {
    return data
  }
}
