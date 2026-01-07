using ChatLab.CoreService.DbManager;
using ChatLab.CoreService.Entities;
using ChatLab.CoreService.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ChatLab.CoreService.Repositories.Classes
{
    public class CommunicationTechnologyRepository : ICommunicationTechnologyRepository
    {
        private readonly AppDbContext _dbContext;

        public CommunicationTechnologyRepository(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<CommunicationTechnology>> GetCommunicationTechnologies()
            => await _dbContext.CommunicationTechnologies.ToListAsync();

        public async Task<int> GetCommunicationTechnologyCount()
            => await _dbContext.CommunicationTechnologies.CountAsync();

        public async Task<int> GetCommunicationTechnologyId(string name)
        {
            return await _dbContext.CommunicationTechnologies
                .Where(c => c.Name == name)
                .Select(c => c.Id)
                .FirstOrDefaultAsync();
        }

        public async Task<string> GetCommunicationTechnologyName(int technologyId)
            => await _dbContext.CommunicationTechnologies.Where(c => c.Id == technologyId).Select(c => c.Name).FirstOrDefaultAsync();

        public async Task<bool> CheckCommunicationTechnologyExists(string name)
        {
            return await _dbContext.CommunicationTechnologies
                .AnyAsync(c => c.Name == name);
        }

        public async Task CreateCommunicationTechnology(CommunicationTechnology communicationTechnology)
        {
            var isExists = await _dbContext.CommunicationTechnologies.AnyAsync(c => c.Name == communicationTechnology.Name);
            if (isExists == true)
                throw new ArgumentException($"Communication Technology {communicationTechnology.Name} already exists!");

            await _dbContext.CommunicationTechnologies.AddAsync(communicationTechnology);
            await _dbContext.SaveChangesAsync();
        }
    }
}