// package: chatlab.grpc
// file: chat.proto

var chat_pb = require("./chat_pb");
var grpc = require("@improbable-eng/grpc-web").grpc;

var ChatGrpc = (function () {
  function ChatGrpc() {}
  ChatGrpc.serviceName = "chatlab.grpc.ChatGrpc";
  return ChatGrpc;
}());

ChatGrpc.SendMessage = {
  methodName: "SendMessage",
  service: ChatGrpc,
  requestStream: false,
  responseStream: false,
  requestType: chat_pb.MessageSend,
  responseType: chat_pb.Message
};

ChatGrpc.StreamChat = {
  methodName: "StreamChat",
  service: ChatGrpc,
  requestStream: false,
  responseStream: true,
  requestType: chat_pb.StreamRequest,
  responseType: chat_pb.Message
};

exports.ChatGrpc = ChatGrpc;

function ChatGrpcClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

ChatGrpcClient.prototype.sendMessage = function sendMessage(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(ChatGrpc.SendMessage, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

ChatGrpcClient.prototype.streamChat = function streamChat(requestMessage, metadata) {
  var listeners = {
    data: [],
    end: [],
    status: []
  };
  var client = grpc.invoke(ChatGrpc.StreamChat, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onMessage: function (responseMessage) {
      listeners.data.forEach(function (handler) {
        handler(responseMessage);
      });
    },
    onEnd: function (status, statusMessage, trailers) {
      listeners.status.forEach(function (handler) {
        handler({ code: status, details: statusMessage, metadata: trailers });
      });
      listeners.end.forEach(function (handler) {
        handler({ code: status, details: statusMessage, metadata: trailers });
      });
      listeners = null;
    }
  });
  return {
    on: function (type, handler) {
      listeners[type].push(handler);
      return this;
    },
    cancel: function () {
      listeners = null;
      client.close();
    }
  };
};

exports.ChatGrpcClient = ChatGrpcClient;

