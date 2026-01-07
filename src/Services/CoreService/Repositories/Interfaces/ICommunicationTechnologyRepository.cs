using ChatLab.CoreService.Entities;

namespace ChatLab.CoreService.Repositories.Interfaces
{
    public interface ICommunicationTechnologyRepository
    {
        Task<IEnumerable<CommunicationTechnology>> GetCommunicationTechnologies();
        Task<int> GetCommunicationTechnologyCount();
        Task<int> GetCommunicationTechnologyId(string name);
        Task<string> GetCommunicationTechnologyName(int technologyId);
        Task<bool> CheckCommunicationTechnologyExists(string name);
        Task CreateCommunicationTechnology(CommunicationTechnology communicationTechnology);
    }
}