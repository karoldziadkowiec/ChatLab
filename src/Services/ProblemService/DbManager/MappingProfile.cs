using AutoMapper;
using ChatLab.ProblemService.Entities;
using ChatLab.ProblemService.Models.DTOs;

namespace ChatLab.ProblemService.DbManager
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            CreateMap<Problem, ProblemDTO>().ReverseMap();
            CreateMap<Problem, ProblemCreateDTO>().ReverseMap();
        }
    }
}