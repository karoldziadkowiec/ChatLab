using System.Security.Claims;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.Constants;
using ChatLab.CoreService.Services.Interfaces;

namespace ChatLab.CoreService.RealTime.Authorization
{
    public static class ChatRoomAuthorizationHelper
    {
        public static string? GetCurrentUserId(ClaimsPrincipal? user)
        {
            return user?.FindFirstValue(ClaimTypes.NameIdentifier);
        }

        public static bool IsAdmin(ClaimsPrincipal? user)
        {
            return user?.IsInRole(Role.Admin) == true;
        }

        public static async Task<Chat> RequireChatMemberAsync(IChatService chatService, int chatId, string? currentUserId)
        {
            if (string.IsNullOrWhiteSpace(currentUserId))
            {
                throw new UnauthorizedAccessException("User is not authenticated.");
            }

            var chat = await chatService.GetChatById(chatId);
            if (chat == null)
            {
                throw new ArgumentException($"Chat with ID {chatId} not found.");
            }

            if (!IsMember(chat, currentUserId))
            {
                throw new UnauthorizedAccessException("User is not a participant of this chat.");
            }

            return chat;
        }

        public static async Task<Chat> RequireChatAccessAsync(IChatService chatService, int chatId, ClaimsPrincipal? user)
        {
            if (IsAdmin(user))
            {
                var chatResult = await chatService.GetChatById(chatId);
                if (chatResult == null)
                {
                    throw new ArgumentException($"Chat with ID {chatId} not found.");
                }

                return chatResult;
            }

            var currentUserId = GetCurrentUserId(user);
            var chat = await RequireChatMemberAsync(chatService, chatId, currentUserId);
            return chat;
        }

        public static async Task<Chat> RequireChatReadAccessAsync(IChatService chatService, int chatId, ClaimsPrincipal? user)
        {
            if (IsAdmin(user))
            {
                var chatResult = await chatService.GetChatById(chatId);
                if (chatResult == null)
                {
                    throw new ArgumentException($"Chat with ID {chatId} not found.");
                }

                return chatResult;
            }

            var currentUserId = GetCurrentUserId(user);
            return await RequireChatMemberAsync(chatService, chatId, currentUserId);
        }

        public static bool IsMember(Chat chat, string userId)
        {
            return string.Equals(chat.User1Id, userId, StringComparison.Ordinal) ||
                   string.Equals(chat.User2Id, userId, StringComparison.Ordinal);
        }

        public static void RequireSenderMatchesCurrentUser(string? currentUserId, string? senderId)
        {
            if (string.IsNullOrWhiteSpace(currentUserId) || string.IsNullOrWhiteSpace(senderId) ||
                !string.Equals(currentUserId, senderId, StringComparison.Ordinal))
            {
                throw new UnauthorizedAccessException("Sender does not match the authenticated user.");
            }
        }

        public static bool CanUseReceiver(Chat chat, string? receiverId, ClaimsPrincipal? user)
        {
            if (IsAdmin(user))
            {
                return true;
            }

            if (string.IsNullOrWhiteSpace(receiverId))
            {
                return false;
            }

            return string.Equals(chat.User1Id, receiverId, StringComparison.Ordinal) ||
                   string.Equals(chat.User2Id, receiverId, StringComparison.Ordinal);
        }

        public static void RequireSenderMatchesCurrentUserOrAdmin(ClaimsPrincipal? user, string? senderId)
        {
            if (IsAdmin(user))
            {
                return;
            }

            RequireSenderMatchesCurrentUser(GetCurrentUserId(user), senderId);
        }
    }
}