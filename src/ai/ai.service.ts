import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as path from 'path';

@Injectable()
export class AiService implements OnModuleInit {
  private readonly pythonPath: string;
  private readonly scriptPath: string;
  private conversationHistory: Array<{role: string, content: string}> = [];
  private readonly MAX_HISTORY = 10;

  constructor(private configService: ConfigService) {
    this.pythonPath = this.configService.get<string>('PYTHON_PATH').replace(/\\/g, '/');
    this.scriptPath = path.join(process.cwd(), 'src/ai/python/rag_service.py').replace(/\\/g, '/');
  }

  async onModuleInit() {
    try {
      const pythonProcess = spawn(this.pythonPath, ['--version']);
      pythonProcess.on('error', (err) => {
        console.error('Lỗi khởi tạo Python:', err);
        throw err;
      });
    } catch (error) {
      console.error('Không thể khởi tạo Python environment:', error);
      throw error;
    }
  }

  async generateResponse(userInput: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(this.pythonPath, [this.scriptPath, userInput]);
      
      let result = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python script error:', error);
          reject(new Error('Lỗi khi chạy Python script'));
          return;
        }

        try {
          const response = JSON.parse(result);
          if (response.error) {
            reject(new Error(response.error));
            return;
          }
          
          console.log('Context used:', response.context);
          resolve(response.response);
        } catch (e) {
          console.error('Error parsing Python response:', e);
          reject(new Error('Lỗi khi xử lý kết quả từ Python'));
        }
      });
    });
  }

  async generateStreamResponse(userInput: string, onChunk: (chunk: any) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('Starting Python process with input:', userInput);
        
        const pythonProcess = spawn(
          this.pythonPath, 
          [
            this.scriptPath, 
            userInput, 
            '--stream', 
            'true',
            '--history', 
            JSON.stringify(this.conversationHistory)
          ],
          { stdio: ['pipe', 'pipe', 'pipe'] }
        );
      
        let responseContent = '';
        let error = '';

        pythonProcess.stdout.on('data', (data) => {
          const lines = data.toString().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              try {
                const chunk = JSON.parse(line);
                if (chunk.type === 'token') {
                  responseContent += chunk.content;
                }
                onChunk(chunk);
              } catch (e) {
                console.error('Error parsing chunk:', e, 'Raw data:', line);
              }
            }
          }
        });

        pythonProcess.stderr.on('data', (data) => {
          error += data.toString();
          console.error('Python stderr:', data.toString());
        });

        pythonProcess.on('error', (err) => {
          console.error('Python process error:', err);
          reject(new Error(`Lỗi khi chạy Python process: ${err.message}`));
        });

        pythonProcess.on('close', (code) => {
          console.log('Python process closed with code:', code);
          if (code !== 0) {
            console.error('Python script error:', error);
            reject(new Error(`Lỗi khi chạy Python script (code ${code}): ${error}`));
            return;
          }

          this.conversationHistory.push({ role: 'user', content: userInput });
          this.conversationHistory.push({ role: 'assistant', content: responseContent });
          
          if (this.conversationHistory.length > this.MAX_HISTORY) {
            this.conversationHistory = this.conversationHistory.slice(-this.MAX_HISTORY);
          }
          
          resolve();
        });
      } catch (error) {
        console.error('Error in generateStreamResponse:', error);
        reject(error);
      }
    });
  }
} 