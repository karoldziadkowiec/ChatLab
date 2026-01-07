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
            CreateMap<User, UserDTO>().ReverseMap();
            CreateMap<User, UserUpdateDTO>().ReverseMap();
            CreateMap<User, UserResetPasswordDTO>().ReverseMap();
            CreateMap<Problem, ProblemDTO>().ReverseMap();
            CreateMap<Problem, ProblemCreateDTO>().ReverseMap();
            CreateMap<UserFollow, UserFollowDTO>().ReverseMap();
            CreateMap<UserFollow, UserFollowCreateDTO>().ReverseMap();
            CreateMap<Chat, ChatDTO>().ReverseMap();
            CreateMap<Chat, ChatCreateDTO>().ReverseMap();
            CreateMap<Message, MessageDTO>().ReverseMap();
            CreateMap<Message, MessageSendDTO>().ReverseMap();
            CreateMap<CommunicationTechnology, CommunicationTechnologyDTO>().ReverseMap();
            CreateMap<CommunicationTechnology, CommunicationTechnologyCreateDTO>().ReverseMap();
        }
    }
}