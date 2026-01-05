import axios from 'axios';
import ApiURL from '../../config/ApiConfig';
import AccountService from './AccountService';
import Problem from '../../models/interfaces/Problem';
import ProblemCreateDTO from '../../models/dtos/ProblemCreateDTO';

const ProblemService = {
    async getProblem(problemId: number): Promise<Problem> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<Problem>(`${ApiURL}/problems/${problemId}`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching problem, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getAllProblems(): Promise<Problem[]> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<Problem[]>(`${ApiURL}/problems`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching all problems, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getSolvedProblems(): Promise<Problem[]> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<Problem[]>(`${ApiURL}/problems/solved`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching all solved problems, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getSolvedProblemCount(): Promise<number> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<number>(`${ApiURL}/problems/solved/count`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching solved problem count, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getUnsolvedProblems(): Promise<Problem[]> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<Problem[]>(`${ApiURL}/problems/unsolved`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching all unsolved problems, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async getUnsolvedProblemCount(): Promise<number> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            const response = await axios.get<number>(`${ApiURL}/problems/unsolved/count`, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error fetching unsolved problem count, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async createProblem(dto: ProblemCreateDTO): Promise<void> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            await axios.post(`${ApiURL}/problems`, dto, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error creating new problem, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async checkProblemSolved(problemId: number, problem: Problem): Promise<void> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();
            await axios.put(`${ApiURL}/problems/${problemId}`, problem, {
                headers: {
                    'Authorization': authorizationHeader
                }
            });
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Error checking problem to solved, details:', error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    },

    async exportProblemsToCsv(): Promise<void> {
        try {
            const authorizationHeader = await AccountService.getAuthorizationHeader();

            const response = await axios.get(`${ApiURL}/problems/export`, {
                headers: {
                    'Authorization': authorizationHeader
                },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'problems.csv');

            document.body.appendChild(link);
            link.click();
            link.remove();
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                console.error("Error exporting problems to CSV, details:", error.response?.data || error.message);
            }
            else {
                console.error('Unexpected error:', error);
            }
            throw error;
        }
    }
};

export default ProblemService;