using ChatLab.CoreService.Entities;
using System.Threading.Channels;

namespace ChatLab.CoreService.RealTime.GRPC.Streaming
{
    public interface IChatMessageBus
    {
        ChannelReader<Message> Subscribe(int chatId, CancellationToken cancellationToken);
        void Publish(Message message);
    }
}
