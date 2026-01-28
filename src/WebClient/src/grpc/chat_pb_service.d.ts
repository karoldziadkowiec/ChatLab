// package: chatlab.grpc
// file: chat.proto

import * as chat_pb from "./chat_pb";
import {grpc} from "@improbable-eng/grpc-web";

type ChatGrpcSendMessage = {
  readonly methodName: string;
  readonly service: typeof ChatGrpc;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof chat_pb.MessageSend;
  readonly responseType: typeof chat_pb.Message;
};

type ChatGrpcStreamChat = {
  readonly methodName: string;
  readonly service: typeof ChatGrpc;
  readonly requestStream: false;
  readonly responseStream: true;
  readonly requestType: typeof chat_pb.StreamRequest;
  readonly responseType: typeof chat_pb.Message;
};

export class ChatGrpc {
  static readonly serviceName: string;
  static readonly SendMessage: ChatGrpcSendMessage;
  static readonly StreamChat: ChatGrpcStreamChat;
}

export type ServiceError = { message: string, code: number; metadata: grpc.Metadata }
export type Status = { details: string, code: number; metadata: grpc.Metadata }

interface UnaryResponse {
  cancel(): void;
}
interface ResponseStream<T> {
  cancel(): void;
  on(type: 'data', handler: (message: T) => void): ResponseStream<T>;
  on(type: 'end', handler: (status?: Status) => void): ResponseStream<T>;
  on(type: 'status', handler: (status: Status) => void): ResponseStream<T>;
}
interface RequestStream<T> {
  write(message: T): RequestStream<T>;
  end(): void;
  cancel(): void;
  on(type: 'end', handler: (status?: Status) => void): RequestStream<T>;
  on(type: 'status', handler: (status: Status) => void): RequestStream<T>;
}
interface BidirectionalStream<ReqT, ResT> {
  write(message: ReqT): BidirectionalStream<ReqT, ResT>;
  end(): void;
  cancel(): void;
  on(type: 'data', handler: (message: ResT) => void): BidirectionalStream<ReqT, ResT>;
  on(type: 'end', handler: (status?: Status) => void): BidirectionalStream<ReqT, ResT>;
  on(type: 'status', handler: (status: Status) => void): BidirectionalStream<ReqT, ResT>;
}

export class ChatGrpcClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: grpc.RpcOptions);
  sendMessage(
    requestMessage: chat_pb.MessageSend,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: chat_pb.Message|null) => void
  ): UnaryResponse;
  sendMessage(
    requestMessage: chat_pb.MessageSend,
    callback: (error: ServiceError|null, responseMessage: chat_pb.Message|null) => void
  ): UnaryResponse;
  streamChat(requestMessage: chat_pb.StreamRequest, metadata?: grpc.Metadata): ResponseStream<chat_pb.Message>;
}

