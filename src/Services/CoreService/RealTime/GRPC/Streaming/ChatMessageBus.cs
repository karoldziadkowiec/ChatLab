using ChatLab.CoreService.Entities;
using System.Collections.Concurrent;
using System.Threading.Channels;

namespace ChatLab.CoreService.RealTime.GRPC.Streaming
{
    public sealed class ChatMessageBus : IChatMessageBus
    {
        private sealed class Subscription
        {
            public required ChannelWriter<Message> Writer { get; init; }
        }

        private readonly ConcurrentDictionary<int, List<Subscription>> _subsByChatId = new();

        public ChannelReader<Message> Subscribe(int chatId, CancellationToken cancellationToken)
        {
            var channel = Channel.CreateBounded<Message>(new BoundedChannelOptions(capacity: 1024)
            {
                SingleReader = true,
                SingleWriter = false,
                FullMode = BoundedChannelFullMode.DropOldest
            });

            var list = _subsByChatId.GetOrAdd(chatId, _ => new List<Subscription>());
            var sub = new Subscription { Writer = channel.Writer };
            lock (list)
            {
                list.Add(sub);
            }

            cancellationToken.Register(() =>
            {
                try { channel.Writer.TryComplete(); } catch { /* ignore */ }

                if (_subsByChatId.TryGetValue(chatId, out var current))
                {
                    lock (current)
                    {
                        current.Remove(sub);
                        if (current.Count == 0)
                        {
                            _subsByChatId.TryRemove(chatId, out _);
                        }
                    }
                }
            });

            return channel.Reader;
        }

        public void Publish(Message message)
        {
            if (!_subsByChatId.TryGetValue(message.ChatId, out var list)) return;

            List<Subscription> snapshot;
            lock (list)
            {
                snapshot = list.ToList();
            }

            List<Subscription>? failed = null;
            foreach (var sub in snapshot)
            {
                // Non-blocking: if the receiver is too slow, we drop oldest messages in its buffer.
                if (!sub.Writer.TryWrite(message))
                {
                    failed ??= new List<Subscription>();
                    failed.Add(sub);
                }
            }

            if (failed is { Count: > 0 })
            {
                lock (list)
                {
                    foreach (var f in failed)
                    {
                        list.Remove(f);
                        try { f.Writer.TryComplete(); } catch { /* ignore */ }
                    }
                    if (list.Count == 0)
                    {
                        _subsByChatId.TryRemove(message.ChatId, out _);
                    }
                }
            }
        }
    }
}
