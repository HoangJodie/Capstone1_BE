import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(
    @Body() body: { message: string }, 
    @Res() res: Response
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      console.log('Receiving chat request:', body.message);
      
      await this.aiService.generateStreamResponse(
        body.message, 
        (chunk) => {
          console.log('Sending chunk:', chunk);
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      );
      
      console.log('Stream completed');
      res.end();
    } catch (error) {
      console.error('Error in chat endpoint:', error);
      res.write(`data: ${JSON.stringify({ error: error.message, type: 'error' })}\n\n`);
      res.end();
    }
  }
} 