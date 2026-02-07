import axios from 'axios';
import ApiProblemURL from '../../config/ApiProblemConfig';
import Problem from '../../models/interfaces/Problem';
import ProblemCreateDTO from '../../models/dtos/ProblemCreateDTO';

const ProblemService = {
    async getProblem(problemId: number): Promise<Problem> {
        try {
            const response = await axios.get<Problem>(`${ApiProblemURL}/${problemId}`);
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
            const response = await axios.get<Problem[]>(`${ApiProblemURL}`);
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
            const response = await axios.get<Problem[]>(`${ApiProblemURL}/solved`);
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
            const response = await axios.get<number>(`${ApiProblemURL}/solved/count`);
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
            const response = await axios.get<Problem[]>(`${ApiProblemURL}/unsolved`);
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
            const response = await axios.get<number>(`${ApiProblemURL}/unsolved/count`);
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
            await axios.post(`${ApiProblemURL}`, dto);
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
            await axios.put(`${ApiProblemURL}/${problemId}`, problem);
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
            const response = await axios.get(`${ApiProblemURL}/export`, {
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