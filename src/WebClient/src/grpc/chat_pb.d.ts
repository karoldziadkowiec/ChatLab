import * as jspb from 'google-protobuf'

import * as google_protobuf_timestamp_pb from 'google-protobuf/google/protobuf/timestamp_pb';


export class StreamRequest extends jspb.Message {
  getChatid(): number;
  setChatid(value: number): StreamRequest;

  getUserid(): string;
  setUserid(value: string): StreamRequest;

  getSincemessageid(): number;
  setSincemessageid(value: number): StreamRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): StreamRequest.AsObject;
  static toObject(includeInstance: boolean, msg: StreamRequest): StreamRequest.AsObject;
  static serializeBinaryToWriter(message: StreamRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): StreamRequest;
  static deserializeBinaryFromReader(message: StreamRequest, reader: jspb.BinaryReader): StreamRequest;
}

export namespace StreamRequest {
  export type AsObject = {
    chatid: number,
    userid: string,
    sincemessageid: number,
  }
}

export class MessageSend extends jspb.Message {
  getChatid(): number;
  setChatid(value: number): MessageSend;

  getSenderid(): string;
  setSenderid(value: string): MessageSend;

  getReceiverid(): string;
  setReceiverid(value: string): MessageSend;

  getCommunicationtechnologyid(): number;
  setCommunicationtechnologyid(value: number): MessageSend;

  getContent(): string;
  setContent(value: string): MessageSend;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): MessageSend.AsObject;
  static toObject(includeInstance: boolean, msg: MessageSend): MessageSend.AsObject;
  static serializeBinaryToWriter(message: MessageSend, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): MessageSend;
  static deserializeBinaryFromReader(message: MessageSend, reader: jspb.BinaryReader): MessageSend;
}

export namespace MessageSend {
  export type AsObject = {
    chatid: number,
    senderid: string,
    receiverid: string,
    communicationtechnologyid: number,
    content: string,
  }
}

export class Message extends jspb.Message {
  getId(): number;
  setId(value: number): Message;

  getChatid(): number;
  setChatid(value: number): Message;

  getSenderid(): string;
  setSenderid(value: string): Message;

  getReceiverid(): string;
  setReceiverid(value: string): Message;

  getContent(): string;
  setContent(value: string): Message;

  getTimestamp(): google_protobuf_timestamp_pb.Timestamp | undefined;
  setTimestamp(value?: google_protobuf_timestamp_pb.Timestamp): Message;
  hasTimestamp(): boolean;
  clearTimestamp(): Message;

  getTechnologyname(): string;
  setTechnologyname(value: string): Message;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Message.AsObject;
  static toObject(includeInstance: boolean, msg: Message): Message.AsObject;
  static serializeBinaryToWriter(message: Message, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Message;
  static deserializeBinaryFromReader(message: Message, reader: jspb.BinaryReader): Message;
}

export namespace Message {
  export type AsObject = {
    id: number,
    chatid: number,
    senderid: string,
    receiverid: string,
    content: string,
    timestamp?: google_protobuf_timestamp_pb.Timestamp.AsObject,
    technologyname: string,
  }
}

