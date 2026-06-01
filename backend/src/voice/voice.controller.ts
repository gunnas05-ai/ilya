import { Controller, Post, Body } from '@nestjs/common';
import { VoiceService } from './voice.service';

@Controller({ path: 'voice', version: '1' })
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('command')
  async processCommand(@Body() body: { command: string; language?: string }) {
    const action = this.voiceService.parseCommand(body.command);
    const response = this.voiceService.generateResponse(action.intent, action.params);
    return {
      data: {
        command: body.command,
        intent: action.intent,
        params: action.params,
        confidence: action.confidence,
        response,
      },
    };
  }

  @Post('tts/load')
  async getLoadSpeech(@Body() body: { load: any }) {
    const speech = this.voiceService.formatLoadForSpeech(body.load);
    return { data: { speech } };
  }

  @Post('ai-dialog')
  async processAiDialog(@Body() body: { message: string; context?: Record<string, any> }) {
    const result = this.voiceService.parseAiDialogMessage(body.message, body.context);
    return { data: result };
  }
}
