import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { nanoid } from 'nanoid'
import { Server, Socket } from 'socket.io'
import { ChatData } from './dto/chat.dto'

@WebSocketGateway()
export class EventsGateway {
  @WebSocketServer()
  server: Server

  async handleConnection(@ConnectedSocket() client: Socket) {
    client.on('disconnecting', () => this.sendLeftChat(client))
  }

  /** 사용자가 방에 접속했을 때 실행됨 */
  @SubscribeMessage('joinRoom')
  joinRoom(
    @MessageBody() { roomId, isTutor }: any,
    @ConnectedSocket() client: Socket
  ) {
    console.log('[joinRoom]', roomId)

    client.join(roomId)

    client.broadcast.to(roomId).emit('hasUser', {
      userId: client.id,
      isTutor,
    })

    if (!client.data) client.data = {}
    client.data.isTutor = isTutor
  }

  /** 방에 새로 접속한 유저에게 기존 유저의 존재를 알림 */
  @SubscribeMessage('meToo')
  meToo(
    @MessageBody() { roomId, isTutor }: any,
    @ConnectedSocket() client: Socket
  ) {
    console.log('[me too]', roomId)

    client.join(roomId)

    client.broadcast.to(roomId).emit('hasUserToo', {
      userId: client.id,
      isTutor,
    })
  }

  /** 통화 시작하기 */
  @SubscribeMessage('startCall')
  startCall(@MessageBody() { userId, signal }: any) {
    console.log('[startCall 받음]')

    this.server.to(userId).emit('startCall', { signal })
  }

  /** 통화 받으면 응답해서 Peer 시그널을 연결함 */
  @SubscribeMessage('answerCall')
  answerCall(@MessageBody() { userId, signal }: any) {
    console.log('[answerCall]', userId)
    this.server.to(userId).emit('callAccepted', signal)
  }

  /** 통화 준비 신호 보냄 */
  @SubscribeMessage('getReady')
  getReady(
    @MessageBody() { roomId, isTutor }: any,
    @ConnectedSocket() client: Socket
  ) {
    console.log('[getReady]', roomId)
    client.broadcast.to(roomId).emit('getReady', { isTutor, userId: client.id })
  }

  /** URL 변경 시 알림 */
  @SubscribeMessage('urlChange')
  urlChange(
    @MessageBody() { roomId, pathname, hash, url }: any,
    @ConnectedSocket() client: Socket
  ) {
    console.log('[url change]', roomId)

    client.broadcast.to(roomId).emit('urlChange', { pathname, hash, url })
  }

  /** 채팅 주고 받음 */
  @SubscribeMessage('sendChat')
  sendChat(
    @MessageBody() { roomId, ...chatData }: ChatData,
    @ConnectedSocket() client: Socket
  ) {
    client.data = { ...(client.data || {}), username: chatData.name }

    this.server.to(roomId).emit('sendChat', chatData)
  }

  /** 나가면 메시지 보냄 */
  sendLeftChat(client: Socket) {
    Object.values(client.rooms).forEach((room) => {
      const username = client?.data?.username
      this.server.to(room).emit('sendChat', {
        id: nanoid(),
        system: true,
        name: username,
        date: new Date(),
        text: `${username} left the chat`,
      })

      client.broadcast.to(room).emit('leaveRoom', {
        userId: client.id,
        isTutor: client.data?.isTutor,
      })
    })
  }

  /** 테스트 함수 */
  @SubscribeMessage('test')
  test(@MessageBody() data: any) {
    console.log('test', data)
  }
}
