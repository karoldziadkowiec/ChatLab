using AutoMapper;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Models.DTOs;

namespace ChatLab.CoreService.DbManager
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<RegisterDTO, User>()
                .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.Email))
                .ForMember(dest => dest.CreationDate, opt => opt.MapFrom(src => DateTime.Now))
                .ForMember(dest => dest.SecurityStamp, opt => opt.MapFrom(src => Guid.NewGuid().ToString()));
            CreateMap<User, UserDTO>();
            CreateMap<UserDTO, User>();
            CreateMap<User, UserUpdateDTO>();
            CreateMap<UserUpdateDTO, User>();
            CreateMap<User, UserResetPasswordDTO>();
            CreateMap<UserResetPasswordDTO, User>();
            CreateMap<Problem, ProblemCreateDTO>();
            CreateMap<ProblemCreateDTO, Problem>();
            // Chat
            CreateMap<Chat, ChatCreateDTO>();
            CreateMap<ChatCreateDTO, Chat>();
            CreateMap<Message, MessageSendDTO>();
            CreateMap<MessageSendDTO, Message>();
        }
    }
}